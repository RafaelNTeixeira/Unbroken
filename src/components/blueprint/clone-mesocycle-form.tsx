"use client";

import { useState } from "react";
import { DEFAULT_PROGRESSION_CONFIG, type ProgressionConfig } from "@/lib/mesocycle/types";
import { formatWeekRange } from "@/lib/planner/date-utils";

const WEEK_PRESETS = [4, 8, 12];

export function CloneMesocycleForm({
  weekStart,
  disabled,
  isPending,
  onSubmit,
}: {
  weekStart: Date;
  disabled: boolean;
  isPending: boolean;
  onSubmit: (args: {
    name: string;
    weekCount: number;
    progressionEnabled: boolean;
    progressionConfig: ProgressionConfig;
  }) => void;
}) {
  const [name, setName] = useState(`Build — ${formatWeekRange(weekStart)}`);
  const [weekCount, setWeekCount] = useState(4);
  const [progressionEnabled, setProgressionEnabled] = useState(true);
  const [config, setConfig] = useState<ProgressionConfig>(DEFAULT_PROGRESSION_CONFIG);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, weekCount, progressionEnabled, progressionConfig: config });
      }}
      className="space-y-4"
    >
      <div>
        <label className="mb-1 block text-sm text-foreground-muted">Mesocycle name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-foreground-muted">
          Total length (weeks, including this template week)
        </label>
        <div className="flex items-center gap-2">
          {WEEK_PRESETS.map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setWeekCount(n)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                weekCount === n
                  ? "border-foreground bg-surface-raised"
                  : "border-border text-foreground-muted hover:bg-surface"
              }`}
            >
              {n}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={52}
            value={weekCount}
            onChange={(e) => setWeekCount(Number(e.target.value) || 1)}
            className="w-20 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus-visible:outline-2"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-3">
        <label className="flex items-center justify-between text-sm">
          <span>Progression toggle</span>
          <input
            type="checkbox"
            checked={progressionEnabled}
            onChange={(e) => setProgressionEnabled(e.target.checked)}
            className="h-4 w-4 accent-[var(--discipline-bike)]"
          />
        </label>
        <p className="mt-1 text-xs text-foreground-muted">
          Scales every session&apos;s duration, distance, and TSS by a compounding weekly
          percentage, with an automatic pullback every N weeks for recovery.
        </p>

        {progressionEnabled && (
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs text-foreground-muted">
                Weekly increase (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={config.weekly_volume_increase_pct}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, weekly_volume_increase_pct: Number(e.target.value) }))
                }
                className="w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus-visible:outline-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground-muted">Deload every</label>
              <input
                type="number"
                min={0}
                value={config.deload_every_n_weeks ?? 0}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    deload_every_n_weeks: Number(e.target.value) || null,
                  }))
                }
                className="w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus-visible:outline-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground-muted">Deload drop (%)</label>
              <input
                type="number"
                value={config.deload_drop_pct}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, deload_drop_pct: Number(e.target.value) }))
                }
                className="w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus-visible:outline-2"
              />
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={disabled || isPending}
        className="w-full rounded-lg bg-discipline-bike px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
      >
        {isPending ? "Cloning…" : `Clone across ${weekCount} weeks`}
      </button>
    </form>
  );
}
