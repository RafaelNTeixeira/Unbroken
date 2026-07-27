"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRow } from "@/lib/supabase/database.types";

export function ProfileForm({ userId, initial }: { userId: string; initial: Partial<UserRow> }) {
  const supabase = createClient();
  const [displayName, setDisplayName] = useState(initial.display_name ?? "");
  const [ftp, setFtp] = useState(initial.ftp_watts?.toString() ?? "");
  const [runPace, setRunPace] = useState(
    initial.threshold_pace_run_sec_per_km?.toString() ?? ""
  );
  const [swimPace, setSwimPace] = useState(
    initial.threshold_pace_swim_sec_per_100m?.toString() ?? ""
  );
  const [maxSessions, setMaxSessions] = useState(
    initial.max_sessions_per_day?.toString() ?? "3"
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");

    const { error } = await supabase
      .from("users")
      .update({
        display_name: displayName || null,
        ftp_watts: ftp ? Number(ftp) : null,
        threshold_pace_run_sec_per_km: runPace ? Number(runPace) : null,
        threshold_pace_swim_sec_per_100m: swimPace ? Number(swimPace) : null,
        max_sessions_per_day: Number(maxSessions) || 3,
      })
      .eq("id", userId);

    setStatus(error ? "error" : "saved");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <div>
        <label className="mb-1 block text-sm text-foreground-muted">Display name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-foreground-muted">FTP (watts)</label>
          <input
            type="number"
            value={ftp}
            onChange={(e) => setFtp(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-foreground-muted">
            Max sessions / day
          </label>
          <input
            type="number"
            min={1}
            max={6}
            value={maxSessions}
            onChange={(e) => setMaxSessions(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-foreground-muted">
            Run threshold pace (sec/km)
          </label>
          <input
            type="number"
            value={runPace}
            onChange={(e) => setRunPace(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-foreground-muted">
            Swim threshold pace (sec/100m)
          </label>
          <input
            type="number"
            value={swimPace}
            onChange={(e) => setSwimPace(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-lg bg-discipline-bike px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
        {status === "saved" && (
          <span className="text-sm text-discipline-mobility">Saved</span>
        )}
        {status === "error" && (
          <span className="text-sm text-discipline-run">
            Couldn&apos;t save — check your connection and try again.
          </span>
        )}
      </div>
    </form>
  );
}
