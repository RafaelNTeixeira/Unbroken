"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { PlannedActivityRow } from "@/lib/supabase/database.types";
import { DISCIPLINE_META } from "@/lib/planner/discipline-meta";

export interface CompletionDraft {
  durationMin: string;
  distanceKm: string;
  averageHeartrate: string;
  averageWatts: string;
}

export function draftToActuals(draft: CompletionDraft) {
  return {
    movingTimeSec: Math.round((Number(draft.durationMin) || 0) * 60),
    distanceM: draft.distanceKm ? Math.round(Number(draft.distanceKm) * 1000) : null,
    averageHeartrate: draft.averageHeartrate ? Number(draft.averageHeartrate) : null,
    averageWatts: draft.averageWatts ? Number(draft.averageWatts) : null,
  };
}

export function LogCompletionSheet({
  activity,
  onClose,
  onSave,
  isSaving,
}: {
  activity: PlannedActivityRow;
  onClose: () => void;
  onSave: (draft: CompletionDraft) => void;
  isSaving: boolean;
}) {
  const meta = DISCIPLINE_META[activity.discipline];
  const [draft, setDraft] = useState<CompletionDraft>({
    durationMin: activity.target_duration_sec
      ? String(Math.round(activity.target_duration_sec / 60))
      : "",
    distanceKm: activity.target_distance_m ? String(activity.target_distance_m / 1000) : "",
    averageHeartrate: "",
    averageWatts: "",
  });

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium">Log completion</h2>
            <p className="text-sm text-foreground-muted">{activity.title}</p>
          </div>
          <button onClick={onClose} className="text-foreground-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-foreground-muted">
                Actual duration (min)
              </label>
              <input
                type="number"
                min={0}
                autoFocus
                value={draft.durationMin}
                onChange={(e) => setDraft((s) => ({ ...s, durationMin: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-foreground-muted">
                Actual distance (km)
              </label>
              <input
                type="number"
                min={0}
                step="0.1"
                value={draft.distanceKm}
                onChange={(e) => setDraft((s) => ({ ...s, distanceKm: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-foreground-muted">Avg HR (optional)</label>
              <input
                type="number"
                min={0}
                value={draft.averageHeartrate}
                onChange={(e) => setDraft((s) => ({ ...s, averageHeartrate: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2"
              />
            </div>
            {(activity.discipline === "bike" || activity.discipline === "run") && (
              <div>
                <label className="mb-1 block text-sm text-foreground-muted">
                  Avg watts (optional)
                </label>
                <input
                  type="number"
                  min={0}
                  value={draft.averageWatts}
                  onChange={(e) => setDraft((s) => ({ ...s, averageWatts: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2"
                />
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => onSave(draft)}
          disabled={isSaving || !draft.durationMin}
          className="mt-5 w-full rounded-lg px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
          style={{ backgroundColor: meta.colorVar }}
        >
          {isSaving ? "Saving…" : "Mark complete"}
        </button>
      </div>
    </div>
  );
}
