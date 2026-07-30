import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CompletedActivityRow,
  Database,
  Discipline,
  ReconciliationStatus,
} from "@/lib/supabase/database.types";
import type { ActualEffort, LogWorkoutInput, LogWorkoutResult, MarkCompleteInput } from "@/lib/logging/types";

type DB = SupabaseClient<Database>;

function toStartedAt(dateKey: string): string {
  // No real workout time is captured for a manual log — noon local avoids
  // any timezone edge cases nudging the date to the day before/after when
  // this gets rendered elsewhere.
  return new Date(`${dateKey}T12:00:00`).toISOString();
}

function pace(effort: ActualEffort): number | null {
  if (!effort.distanceM || effort.distanceM <= 0) return null;
  return effort.movingTimeSec / (effort.distanceM / 1000);
}

async function insertCompleted(
  supabase: DB,
  userId: string,
  discipline: Discipline,
  title: string,
  dateKey: string,
  effort: ActualEffort
): Promise<CompletedActivityRow> {
  const { data, error } = await supabase
    .from("completed_activities")
    .insert({
      user_id: userId,
      strava_id: null,
      discipline,
      name: title,
      started_at: toStartedAt(dateKey),
      moving_time_sec: effort.movingTimeSec,
      elapsed_time_sec: effort.movingTimeSec,
      distance_m: effort.distanceM,
      average_heartrate: effort.averageHeartrate,
      max_heartrate: null,
      average_watts: effort.averageWatts,
      normalized_power: null,
      average_pace_sec_per_km: pace(effort),
      raw_payload: null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function writeReconciliationLog(
  supabase: DB,
  userId: string,
  plannedActivityId: string | null,
  completed: CompletedActivityRow,
  status: ReconciliationStatus,
  targetDurationSec: number | null,
  targetDistanceM: number | null
): Promise<void> {
  const { data: user } = await supabase
    .from("users")
    .select("ftp_watts")
    .eq("id", userId)
    .maybeSingle();

  const durationVariance =
    targetDurationSec !== null ? completed.moving_time_sec! - targetDurationSec : null;
  const distanceVariance =
    targetDistanceM !== null && completed.distance_m !== null
      ? completed.distance_m - targetDistanceM
      : null;
  const powerAdherence =
    user?.ftp_watts && completed.average_watts
      ? Math.round((completed.average_watts / user.ftp_watts) * 100)
      : null;

  const { error } = await supabase.from("reconciliation_logs").upsert(
    {
      user_id: userId,
      planned_activity_id: plannedActivityId,
      completed_activity_id: completed.id,
      status,
      duration_variance_sec: durationVariance,
      distance_variance_m: distanceVariance,
      power_adherence_pct: powerAdherence,
      // True Pw:Hr decoupling needs time-series data a manual log can't
      // provide — same documented gap as the (now-removed) Strava path.
      heartrate_decoupling_pct: null,
      matched_at: status === "matched" ? new Date().toISOString() : null,
    },
    plannedActivityId ? { onConflict: "planned_activity_id,completed_activity_id" } : undefined
  );
  if (error) throw error;
}

// Called from the Planner: the user already told us exactly which planned
// session this completes, so no matching heuristic is needed.
export async function markActivityComplete(
  supabase: DB,
  userId: string,
  planned: {
    id: string;
    discipline: Discipline;
    title: string;
    target_duration_sec: number | null;
    target_distance_m: number | null;
  },
  input: MarkCompleteInput
): Promise<CompletedActivityRow> {
  const completed = await insertCompleted(
    supabase,
    userId,
    planned.discipline,
    planned.title,
    input.dateKey,
    input
  );
  await writeReconciliationLog(
    supabase,
    userId,
    planned.id,
    completed,
    "matched",
    planned.target_duration_sec,
    planned.target_distance_m
  );
  return completed;
}

// Called from the Dashboard: a free-standing log. Tries to auto-match
// against that day's plan (closest duration, same discipline, not already
// matched) — the same heuristic the removed Strava webhook used to apply.
export async function logWorkout(
  supabase: DB,
  userId: string,
  input: LogWorkoutInput
): Promise<LogWorkoutResult> {
  const completed = await insertCompleted(
    supabase,
    userId,
    input.discipline,
    input.title,
    input.dateKey,
    input
  );

  const { data: day } = await supabase
    .from("planned_days")
    .select("id")
    .eq("user_id", userId)
    .eq("calendar_date", input.dateKey)
    .maybeSingle();

  if (!day) {
    await writeReconciliationLog(supabase, userId, null, completed, "unplanned_extra", null, null);
    return { matched: false };
  }

  const { data: candidates } = await supabase
    .from("planned_activities")
    .select("*")
    .eq("planned_day_id", day.id)
    .eq("discipline", input.discipline)
    .eq("is_bolted", false);

  if (!candidates || candidates.length === 0) {
    await writeReconciliationLog(supabase, userId, null, completed, "unplanned_extra", null, null);
    return { matched: false };
  }

  const { data: existingMatches } = await supabase
    .from("reconciliation_logs")
    .select("planned_activity_id")
    .eq("status", "matched")
    .in(
      "planned_activity_id",
      candidates.map((c) => c.id)
    );
  const alreadyMatched = new Set((existingMatches ?? []).map((m) => m.planned_activity_id));
  const open = candidates.filter((c) => !alreadyMatched.has(c.id));

  if (open.length === 0) {
    await writeReconciliationLog(supabase, userId, null, completed, "unplanned_extra", null, null);
    return { matched: false };
  }

  open.sort(
    (a, b) =>
      Math.abs((a.target_duration_sec ?? 0) - input.movingTimeSec) -
      Math.abs((b.target_duration_sec ?? 0) - input.movingTimeSec)
  );
  const planned = open[0];

  await writeReconciliationLog(
    supabase,
    userId,
    planned.id,
    completed,
    "matched",
    planned.target_duration_sec,
    planned.target_distance_m
  );
  return { matched: true };
}

export async function fetchWeekCompletionStatus(
  supabase: DB,
  userId: string,
  plannedActivityIds: string[]
): Promise<Map<string, ReconciliationStatus>> {
  if (plannedActivityIds.length === 0) return new Map();

  const { data } = await supabase
    .from("reconciliation_logs")
    .select("planned_activity_id, status")
    .eq("user_id", userId)
    .in("planned_activity_id", plannedActivityIds);

  const map = new Map<string, ReconciliationStatus>();
  for (const row of data ?? []) {
    if (row.planned_activity_id) map.set(row.planned_activity_id, row.status);
  }
  return map;
}
