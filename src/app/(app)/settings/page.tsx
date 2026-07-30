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
          Thresholds here drive target zones across the planner, and your FTP drives the power
          adherence numbers shown when you log a completed session.
        </p>
      </div>

      <ProfileForm userId={authUserId} initial={profile ?? {}} />
    </div>
  );
}
