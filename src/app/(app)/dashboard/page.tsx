import type { PlannedActivityRow } from "@/lib/supabase/database.types";
import { CalendarRange, Link2, Waves } from "lucide-react";
import { getAuthUserAndProfile } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { DISCIPLINE_META } from "@/lib/planner/discipline-meta";
import { formatDuration, toDateKey } from "@/lib/planner/date-utils";

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

export default async function DashboardPage() {
  const { authUserId, profile } = await getAuthUserAndProfile();
  const name = profile?.display_name?.split(" ")[0] || "there";
  const stravaConnected = Boolean(profile?.strava_athlete_id);
  const todaysActivities = authUserId ? await getTodaysActivities(authUserId) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Welcome back, {name}</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Here&apos;s where today&apos;s plan and recent Strava activity will live.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
            Strava connection
          </div>
          <p className="mt-3 text-sm">
            {stravaConnected ? (
              <span className="text-discipline-mobility">Connected</span>
            ) : (
              <span className="text-foreground-muted">
                Not connected yet — automated ingestion arrives in Phase 5.
              </span>
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <Waves size={16} />
            Fitness (CTL / ATL / TSB)
          </div>
          <p className="mt-3 text-sm text-foreground-muted">
            Load charts arrive in Phase 6, once real workouts start flowing in.
          </p>
        </div>
      </div>
    </div>
  );
}
