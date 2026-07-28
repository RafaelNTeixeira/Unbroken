"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Discipline, PlannedActivityRow, TrainingZone } from "@/lib/supabase/database.types";
import { DISCIPLINES, DISCIPLINE_META, ZONE_META } from "@/lib/planner/discipline-meta";

export interface ActivityDraft {
  title: string;
  discipline: Discipline;
  durationMin: string;
  distanceKm: string;
  targetZone: TrainingZone | "";
  targetTss: string;
  timeOfDay: string;
}

function draftFromActivity(activity: PlannedActivityRow): ActivityDraft {
  return {
    title: activity.title,
    discipline: activity.discipline,
    durationMin: activity.target_duration_sec ? String(Math.round(activity.target_duration_sec / 60)) : "",
    distanceKm: activity.target_distance_m ? String(activity.target_distance_m / 1000) : "",
    targetZone: activity.target_zone ?? "",
    targetTss: activity.target_tss ? String(activity.target_tss) : "",
    timeOfDay: activity.time_of_day?.slice(0, 5) ?? "",
  };
}

export function draftToPatch(draft: ActivityDraft) {
  return {
    title: draft.title.trim() || DISCIPLINE_META[draft.discipline].label,
    discipline: draft.discipline,
    targetDurationSec: draft.durationMin ? Number(draft.durationMin) * 60 : null,
    targetDistanceM: draft.distanceKm ? Math.round(Number(draft.distanceKm) * 1000) : null,
    targetZone: draft.targetZone || null,
    targetTss: draft.targetTss ? Number(draft.targetTss) : null,
    timeOfDay: draft.timeOfDay || null,
  };
}

export function ActivityEditorSheet({
  mode,
  initial,
  defaultDiscipline,
  title,
  onClose,
  onSave,
  onDelete,
}: {
  mode: "edit" | "create";
  initial?: PlannedActivityRow;
  defaultDiscipline?: Discipline;
  title: string;
  onClose: () => void;
  onSave: (draft: ActivityDraft) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<ActivityDraft>(
    initial
      ? draftFromActivity(initial)
      : {
          title: "",
          discipline: defaultDiscipline ?? "run",
          durationMin: String(Math.round(DISCIPLINE_META[defaultDiscipline ?? "run"].defaultDurationSec / 60)),
          distanceKm: "",
          targetZone: "",
          targetTss: "",
          timeOfDay: "",
        }
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-sm flex-col border-l border-border bg-background p-5"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-medium">{title}</h2>
          <button onClick={onClose} className="text-foreground-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto">
          <div>
            <label className="mb-1 block text-sm text-foreground-muted">Discipline</label>
            <div className="grid grid-cols-3 gap-2">
              {DISCIPLINES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDraft((s) => ({ ...s, discipline: d }))}
                  className={`rounded-lg border px-2 py-1.5 text-xs ${
                    draft.discipline === d
                      ? "border-foreground bg-surface-raised"
                      : "border-border text-foreground-muted hover:bg-surface"
                  }`}
                >
                  {DISCIPLINE_META[d].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-foreground-muted">Title</label>
            <input
              value={draft.title}
              onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))}
              placeholder={DISCIPLINE_META[draft.discipline].label}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-foreground-muted">Duration (min)</label>
              <input
                type="number"
                min={0}
                value={draft.durationMin}
                onChange={(e) => setDraft((s) => ({ ...s, durationMin: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-foreground-muted">Distance (km)</label>
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
              <label className="mb-1 block text-sm text-foreground-muted">Target zone</label>
              <select
                value={draft.targetZone}
                onChange={(e) =>
                  setDraft((s) => ({ ...s, targetZone: e.target.value as TrainingZone | "" }))
                }
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2"
              >
                <option value="">—</option>
                {Object.entries(ZONE_META).map(([zone, meta]) => (
                  <option key={zone} value={zone}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-foreground-muted">Target TSS</label>
              <input
                type="number"
                min={0}
                value={draft.targetTss}
                onChange={(e) => setDraft((s) => ({ ...s, targetTss: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-foreground-muted">Time of day (optional)</label>
            <input
              type="time"
              value={draft.timeOfDay}
              onChange={(e) => setDraft((s) => ({ ...s, timeOfDay: e.target.value }))}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={() => onSave(draft)}
            className="flex-1 rounded-lg bg-discipline-bike px-3 py-2 text-sm font-medium text-black"
          >
            {mode === "create" ? "Add session" : "Save changes"}
          </button>
          {mode === "edit" && onDelete && (
            <button
              onClick={onDelete}
              className="rounded-lg border border-border px-3 py-2 text-sm text-discipline-run hover:bg-surface"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
