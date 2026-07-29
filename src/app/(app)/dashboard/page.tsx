import type { CompletedActivityRow, PlannedActivityRow, ReconciliationStatus } from "@/lib/supabase/database.types";
import { CalendarRange, CheckCircle2, Link2 } from "lucide-react";
import { getAuthUserAndProfile } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { DISCIPLINE_META } from "@/lib/planner/discipline-meta";
import { addDays, formatDuration, toDateKey } from "@/lib/planner/date-utils";

async function getTodaysActivities(userId: string): Promise<PlannedActivityRow[]> {
  const supabase = await createClient();
  const todayKey = toDateKey(new Date());

  const { data: day } = await supabase
    .from("planned_days")
    .select("id")
    .eq("user_id", userId)
    .eq("calendar_date", todayKey)
    .maybeSingle();

  if (!day) return [];

  const { data: activities } = await supabase
    .from("planned_activities")
    .select("*")
    .eq("planned_day_id", day.id)
    .eq("is_bolted", false)
    .order("display_order", { ascending: true })
    .returns<PlannedActivityRow[]>();

  return activities ?? [];
}

async function getRecentCompleted(userId: string): Promise<CompletedActivityRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("completed_activities")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(5)
    .returns<CompletedActivityRow[]>();
  return data ?? [];
}

async function getMatchStatuses(
  userId: string,
  completedIds: string[]
): Promise<Map<string, ReconciliationStatus>> {
  if (completedIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("reconciliation_logs")
    .select("completed_activity_id, status")
    .eq("user_id", userId)
    .in("completed_activity_id", completedIds);

  const map = new Map<string, ReconciliationStatus>();
  for (const row of data ?? []) {
    if (row.completed_activity_id) map.set(row.completed_activity_id, row.status);
  }
  return map;
}

// Derived, not stored: a planned (non-bolted) session from the last 7 days
// with no 'matched' reconciliation_logs row. See README Phase 5 notes on
// why this is computed on read rather than written by a cron job.
async function getMissedCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const weekAgoKey = toDateKey(addDays(new Date(), -7));
  const todayKey = toDateKey(new Date());

  const { data: days } = await supabase
    .from("planned_days")
    .select("id")
    .eq("user_id", userId)
    .gte("calendar_date", weekAgoKey)
    .lt("calendar_date", todayKey);
  const dayIds = (days ?? []).map((d) => d.id);
  if (dayIds.length === 0) return 0;

  const { data: activities } = await supabase
    .from("planned_activities")
    .select("id")
    .in("planned_day_id", dayIds)
    .eq("is_bolted", false);
  const activityIds = (activities ?? []).map((a) => a.id);
  if (activityIds.length === 0) return 0;

  const { data: matched } = await supabase
    .from("reconciliation_logs")
    .select("planned_activity_id")
    .eq("status", "matched")
    .in("planned_activity_id", activityIds);
  const matchedSet = new Set((matched ?? []).map((m) => m.planned_activity_id));

  return activityIds.filter((id) => !matchedSet.has(id)).length;
}

export default async function DashboardPage() {
  const { authUserId, profile } = await getAuthUserAndProfile();
  const name = profile?.display_name?.split(" ")[0] || "there";
  const stravaConnected = Boolean(profile?.strava_athlete_id);

  const todaysActivities = authUserId ? await getTodaysActivities(authUserId) : [];
  const recentCompleted = authUserId && stravaConnected ? await getRecentCompleted(authUserId) : [];
  const matchStatuses = authUserId
    ? await getMatchStatuses(
        authUserId,
        recentCompleted.map((a) => a.id)
      )
    : new Map<string, ReconciliationStatus>();
  const missedCount = authUserId && stravaConnected ? await getMissedCount(authUserId) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Welcome back, {name}</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Here&apos;s today&apos;s plan and your recent Strava activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <CalendarRange size={16} />
            Today&apos;s sessions
          </div>
          {todaysActivities.length === 0 ? (
            <p className="mt-3 text-sm text-foreground-muted">
              Nothing planned yet — build your week in the Planner.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {todaysActivities.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: DISCIPLINE_META[a.discipline].colorVar }}
                  />
                  <span className="truncate">{a.title}</span>
                  <span className="shrink-0 text-xs text-foreground-muted">
                    {formatDuration(a.target_duration_sec)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <Link2 size={16} />
            Strava
          </div>

          {!stravaConnected ? (
            <p className="mt-3 text-sm text-foreground-muted">
              Not connected —{" "}
              <a href="/settings" className="underline">
                connect it in Settings
              </a>{" "}
              to auto-ingest workouts.
            </p>
          ) : (
            <>
              {missedCount > 0 && (
                <p className="mt-3 text-sm text-discipline-run">
                  {missedCount} planned session{missedCount === 1 ? "" : "s"} from the last 7
                  days {missedCount === 1 ? "hasn't" : "haven't"} matched an activity yet.
                </p>
              )}
              {recentCompleted.length === 0 ? (
                <p className="mt-3 text-sm text-foreground-muted">
                  Connected — no activities synced yet.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {recentCompleted.map((a) => {
                    const status = matchStatuses.get(a.id);
                    return (
                      <li key={a.id} className="flex items-center gap-2 text-sm">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: DISCIPLINE_META[a.discipline].colorVar }}
                        />
                        <span className="truncate">{a.name ?? DISCIPLINE_META[a.discipline].label}</span>
                        <span className="shrink-0 text-xs text-foreground-muted">
                          {formatDuration(a.moving_time_sec)}
                        </span>
                        {status === "matched" && (
                          <CheckCircle2 size={13} className="shrink-0 text-discipline-mobility" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
