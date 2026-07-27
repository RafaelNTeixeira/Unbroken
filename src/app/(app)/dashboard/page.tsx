import { CalendarRange, Link2, Waves } from "lucide-react";
import { getAuthUserAndProfile } from "@/lib/supabase/get-user";

export default async function DashboardPage() {
  const { profile } = await getAuthUserAndProfile();
  const name = profile?.display_name?.split(" ")[0] || "there";
  const stravaConnected = Boolean(profile?.strava_athlete_id);

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
          <p className="mt-3 text-sm text-foreground-muted">
            No planner data yet — the Weekly Planner lands in Phase 2.
          </p>
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
