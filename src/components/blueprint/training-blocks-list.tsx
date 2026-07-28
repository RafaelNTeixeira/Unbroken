"use client";

import { Trash2 } from "lucide-react";
import type { TrainingBlockRow } from "@/lib/supabase/database.types";
import { parseDateKey } from "@/lib/planner/date-utils";

function formatRange(block: TrainingBlockRow): string {
  const start = parseDateKey(block.start_date);
  const end = parseDateKey(block.end_date);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function TrainingBlocksList({
  blocks,
  onDelete,
}: {
  blocks: TrainingBlockRow[];
  onDelete: (id: string) => void;
}) {
  if (blocks.length === 0) {
    return (
      <p className="text-sm text-foreground-muted">
        No mesocycles yet — clone a template week above to create one.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {blocks.map((block) => (
        <li
          key={block.id}
          className="flex items-center justify-between rounded-xl border border-border bg-surface p-3"
        >
          <div>
            <p className="text-sm font-medium">{block.name}</p>
            <p className="text-xs text-foreground-muted">
              {formatRange(block)}
              {block.progression_enabled && (
                <>
                  {" "}
                  · +{block.progression_config?.weekly_volume_increase_pct ?? 0}%/wk
                  {block.progression_config?.deload_every_n_weeks
                    ? `, deload every ${block.progression_config.deload_every_n_weeks}wk`
                    : ""}
                </>
              )}
            </p>
          </div>
          <button
            onClick={() => onDelete(block.id)}
            className="rounded-md p-1.5 text-foreground-muted hover:bg-surface-raised hover:text-discipline-run"
            aria-label={`Delete ${block.name}`}
          >
            <Trash2 size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}
