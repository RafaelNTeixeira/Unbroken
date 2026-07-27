import { getAuthUserAndProfile } from "@/lib/supabase/get-user";
import { ProfileForm } from "@/components/settings/profile-form";

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

      <div className="max-w-lg rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-medium">Strava connection</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Connecting Strava and automatic activity ingestion ship in Phase 5.
        </p>
        <button
          disabled
          className="mt-3 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground-muted opacity-60"
        >
          Connect Strava
        </button>
      </div>
    </div>
  );
}
