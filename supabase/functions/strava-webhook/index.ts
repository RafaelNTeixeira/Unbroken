// Supabase Edge Function: strava-webhook
//
// Deploy:   supabase functions deploy strava-webhook --no-verify-jwt
// Secrets (supabase secrets set KEY=value):
//   STRAVA_CLIENT_ID
//   STRAVA_CLIENT_SECRET
//   STRAVA_TOKEN_ENCRYPTION_KEY   — must match the Next.js app's value exactly
//   STRAVA_WEBHOOK_VERIFY_TOKEN   — any string you choose; used only for the
//                                   one-time GET handshake when registering
//                                   the subscription (see SETUP.md)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by
// the platform — do not set them yourself.
//
// This function intentionally has no dependency on src/ — Deno Edge
// Functions can't import from the Next.js app, so the discipline-mapping
// logic here is a deliberate duplicate of src/lib/strava/discipline-map.ts.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;
const ENCRYPTION_KEY = Deno.env.get("STRAVA_TOKEN_ENCRYPTION_KEY")!;
const VERIFY_TOKEN = Deno.env.get("STRAVA_WEBHOOK_VERIFY_TOKEN")!;

// deno-lint-ignore no-explicit-any
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY) as any;

type Discipline = "swim" | "bike" | "run" | "strength" | "mobility" | "other";

function mapDiscipline(stravaType: string): Discipline {
  const t = (stravaType ?? "").toLowerCase();
  if (t.includes("swim")) return "swim";
  if (t.includes("ride") || t.includes("bike") || t.includes("cycl")) return "bike";
  if (t.includes("run")) return "run";
  if (
    t.includes("weight") ||
    t.includes("workout") ||
    t.includes("crossfit") ||
    t.includes("strength")
  )
    return "strength";
  if (t.includes("yoga") || t.includes("stretch") || t.includes("mobility")) return "mobility";
  return "other";
}

interface StravaWebhookEvent {
  object_type: "activity" | "athlete";
  object_id: number;
  aspect_type: "create" | "update" | "delete";
  owner_id: number;
  subscription_id: number;
  event_time: number;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // Strava's one-time webhook validation handshake, sent when you register
  // the subscription (see SETUP.md). Must echo back hub.challenge exactly.
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
      return new Response(JSON.stringify({ "hub.challenge": challenge }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let event: StravaWebhookEvent;
  try {
    event = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // Strava expects a fast 200; it disables the subscription after repeated
  // failures. Errors are logged (visible via `supabase functions logs`)
  // rather than surfaced as a non-200, so a transient failure on one
  // activity never risks losing the whole subscription.
  try {
    if (event.object_type === "activity") {
      if (event.aspect_type === "delete") {
        await handleDelete(event);
      } else {
        await handleUpsert(event);
      }
    }
  } catch (err) {
    console.error("strava-webhook processing error", err);
  }

  return new Response("OK", { status: 200 });
});

async function findUserIdForAthlete(athleteId: number): Promise<string | null> {
  const { data } = await admin
    .from("users")
    .select("id")
    .eq("strava_athlete_id", athleteId)
    .maybeSingle();
  return data?.id ?? null;
}

async function getValidAccessToken(userId: string): Promise<string | null> {
  const { data, error } = await admin.rpc("get_strava_tokens", {
    p_user_id: userId,
    p_encryption_key: ENCRYPTION_KEY,
  });
  if (error || !data || data.length === 0) return null;

  const tokens = data[0];
  if (!tokens.access_token || !tokens.refresh_token) return null;

  const expiresAt = tokens.expires_at ? new Date(tokens.expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 60_000) {
    return tokens.access_token;
  }

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    }),
  });
  if (!res.ok) return null;
  const refreshed = await res.json();

  await admin.rpc("save_strava_tokens", {
    p_user_id: userId,
    p_athlete_id: tokens.athlete_id,
    p_access_token: refreshed.access_token,
    p_refresh_token: refreshed.refresh_token,
    p_expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
    p_encryption_key: ENCRYPTION_KEY,
  });

  return refreshed.access_token;
}

async function handleDelete(event: StravaWebhookEvent) {
  const { data: completed } = await admin
    .from("completed_activities")
    .select("id")
    .eq("strava_id", event.object_id)
    .maybeSingle();
  if (!completed) return;

  await admin.from("reconciliation_logs").delete().eq("completed_activity_id", completed.id);
  await admin.from("completed_activities").delete().eq("id", completed.id);
}

async function handleUpsert(event: StravaWebhookEvent) {
  const userId = await findUserIdForAthlete(event.owner_id);
  if (!userId) return; // Not a connected user of this app.

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return;

  const activityRes = await fetch(
    `https://www.strava.com/api/v3/activities/${event.object_id}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!activityRes.ok) return;
  // deno-lint-ignore no-explicit-any
  const activity: any = await activityRes.json();

  const discipline = mapDiscipline(activity.sport_type ?? activity.type ?? "");

  const { data: completedRow, error: upsertError } = await admin
    .from("completed_activities")
    .upsert(
      {
        user_id: userId,
        strava_id: activity.id,
        discipline,
        name: activity.name,
        started_at: activity.start_date,
        moving_time_sec: activity.moving_time,
        elapsed_time_sec: activity.elapsed_time,
        distance_m: activity.distance,
        average_heartrate: activity.average_heartrate ?? null,
        max_heartrate: activity.max_heartrate ?? null,
        average_watts: activity.average_watts ?? null,
        normalized_power: activity.weighted_average_watts ?? null,
        average_pace_sec_per_km:
          activity.distance > 0 ? activity.moving_time / (activity.distance / 1000) : null,
        raw_payload: activity,
      },
      { onConflict: "strava_id" }
    )
    .select("*")
    .single();

  if (upsertError || !completedRow) {
    console.error("completed_activities upsert failed", upsertError);
    return;
  }

  await reconcile(userId, completedRow, discipline);
}

// deno-lint-ignore no-explicit-any
async function reconcile(userId: string, completed: any, discipline: Discipline) {
  // Strava's start_date_local isn't returned by the single-activity endpoint
  // in all cases, so we bucket by the UTC start_date's date component. Close
  // enough for same-day matching in the vast majority of real-world cases.
  const localDate = (completed.started_at as string).slice(0, 10);

  const { data: day } = await admin
    .from("planned_days")
    .select("id")
    .eq("user_id", userId)
    .eq("calendar_date", localDate)
    .maybeSingle();
  if (!day) return;

  const { data: candidates } = await admin
    .from("planned_activities")
    .select("*")
    .eq("planned_day_id", day.id)
    .eq("discipline", discipline)
    .eq("is_bolted", false);
  if (!candidates || candidates.length === 0) return;

  const { data: existingMatches } = await admin
    .from("reconciliation_logs")
    .select("planned_activity_id")
    .eq("status", "matched")
    // deno-lint-ignore no-explicit-any
    .in("planned_activity_id", candidates.map((c: any) => c.id));
  // deno-lint-ignore no-explicit-any
  const alreadyMatched = new Set((existingMatches ?? []).map((m: any) => m.planned_activity_id));

  // deno-lint-ignore no-explicit-any
  const open = candidates.filter((c: any) => !alreadyMatched.has(c.id));
  if (open.length === 0) return;

  open.sort(
    // deno-lint-ignore no-explicit-any
    (a: any, b: any) =>
      Math.abs((a.target_duration_sec ?? 0) - completed.moving_time_sec) -
      Math.abs((b.target_duration_sec ?? 0) - completed.moving_time_sec)
  );
  const planned = open[0];

  const { data: user } = await admin
    .from("users")
    .select("ftp_watts")
    .eq("id", userId)
    .maybeSingle();

  const durationVariance = planned.target_duration_sec
    ? completed.moving_time_sec - planned.target_duration_sec
    : null;
  const distanceVariance = planned.target_distance_m
    ? completed.distance_m - planned.target_distance_m
    : null;
  const powerAdherence =
    user?.ftp_watts && completed.average_watts
      ? Math.round((completed.average_watts / user.ftp_watts) * 100)
      : null;

  await admin.from("reconciliation_logs").upsert(
    {
      user_id: userId,
      planned_activity_id: planned.id,
      completed_activity_id: completed.id,
      status: "matched",
      duration_variance_sec: durationVariance,
      distance_variance_m: distanceVariance,
      power_adherence_pct: powerAdherence,
      // True Pw:Hr decoupling needs time-series stream data (Strava's
      // /activities/{id}/streams endpoint), not the summary payload this
      // function fetches. Left null deliberately — see README Phase 5 notes.
      heartrate_decoupling_pct: null,
      matched_at: new Date().toISOString(),
    },
    { onConflict: "planned_activity_id,completed_activity_id" }
  );
}
