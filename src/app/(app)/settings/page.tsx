import { Suspense } from "react";
import { getAuthUserAndProfile } from "@/lib/supabase/get-user";
import { ProfileForm } from "@/components/settings/profile-form";
import { StravaConnectCard } from "@/components/settings/strava-connect-card";

export default async function SettingsPage() {
  const { authUserId, profile } = await getAuthUserAndProfile();

  if (!authUserId) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Thresholds here drive target zones across the planner and analytics.
        </p>
      </div>

      <ProfileForm userId={authUserId} initial={profile ?? {}} />

      <Suspense fallback={null}>
        <StravaConnectCard
          userId={authUserId}
          connected={Boolean(profile?.strava_athlete_id)}
          athleteId={profile?.strava_athlete_id ?? null}
        />
      </Suspense>
    </div>
  );
}
