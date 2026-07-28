"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Link2, Pencil, Plus, Trash2, X } from "lucide-react";
import type { PlannedActivityRow } from "@/lib/supabase/database.types";
import { DISCIPLINE_META, ZONE_META } from "@/lib/planner/discipline-meta";
import { formatDuration } from "@/lib/planner/date-utils";

function SessionSummary({ activity }: { activity: PlannedActivityRow }) {
  const parts: string[] = [];
  const duration = formatDuration(activity.target_duration_sec);
  if (duration) parts.push(duration);
  if (activity.target_distance_m) parts.push(`${(activity.target_distance_m / 1000).toFixed(1)}km`);
  if (activity.target_zone) parts.push(ZONE_META[activity.target_zone].label);
  if (activity.target_tss) parts.push(`${activity.target_tss} TSS`);
  return <p className="text-xs text-foreground-muted">{parts.join(" · ") || "No details yet"}</p>;
}

export function ActivityCard({
  activity,
  dateKey,
  boltedChildren,
  brickPartnerTitle,
  combinedBrickSummary,
  onEdit,
  onDelete,
  onToggleBrickWithNext,
  canLinkBrickWithNext,
  onBolt,
  onUnbolt,
}: {
  activity: PlannedActivityRow;
  dateKey: string;
  boltedChildren: PlannedActivityRow[];
  brickPartnerTitle: string | null;
  combinedBrickSummary: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onToggleBrickWithNext: (() => void) | null;
  canLinkBrickWithNext: boolean;
  onBolt: () => void;
  onUnbolt: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const meta = DISCIPLINE_META[activity.discipline];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
    data: { type: "activity", dateKey },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-40" : ""}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="group relative rounded-xl border border-border bg-surface-raised p-3"
      >
        {activity.is_brick && (
          <span
            className="absolute -left-[7px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-background"
            style={{ backgroundColor: "var(--zone-z4)" }}
            title={brickPartnerTitle ? `Brick with ${brickPartnerTitle}` : "Brick"}
          />
        )}

        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab text-foreground-muted opacity-0 transition-opacity group-hover:opacity-100"
            style={{ touchAction: "none" }}
            aria-label="Drag to reorder"
          >
            <GripVertical size={14} />
          </button>

          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: meta.colorVar }}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">{activity.title}</p>
              {activity.time_of_day && (
                <span className="shrink-0 text-[11px] text-foreground-muted">
                  {activity.time_of_day.slice(0, 5)}
                </span>
              )}
            </div>
            <SessionSummary activity={activity} />
            {combinedBrickSummary && (
              <p className="mt-0.5 text-[11px] text-zone-z4">{combinedBrickSummary}</p>
            )}
          </div>
        </div>

        {boltedChildren.length > 0 && (
          <div className="mt-2 space-y-1.5 border-l-2 border-border pl-3">
            {boltedChildren.map((child) => {
              const childMeta = DISCIPLINE_META[child.discipline];
              return (
                <div key={child.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: childMeta.colorVar }}
                    />
                    <span className="truncate">{child.title}</span>
                    <span className="text-foreground-muted">
                      {formatDuration(child.target_duration_sec)}
                    </span>
                  </div>
                  <button
                    onClick={() => onUnbolt(child.id)}
                    className="text-foreground-muted opacity-0 hover:text-discipline-run group-hover:opacity-100"
                    aria-label="Unbolt"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div
          className={`mt-2 flex items-center gap-1 transition-opacity ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            onClick={onEdit}
            className="rounded-md p-1 text-foreground-muted hover:bg-surface hover:text-foreground"
            aria-label="Edit session"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={onBolt}
            className="rounded-md p-1 text-foreground-muted hover:bg-surface hover:text-foreground"
            aria-label="Bolt a short session onto this one"
          >
            <Plus size={12} />
          </button>
          {(canLinkBrickWithNext || activity.is_brick) && onToggleBrickWithNext && (
            <button
              onClick={onToggleBrickWithNext}
              className={`rounded-md p-1 hover:bg-surface ${
                activity.is_brick ? "text-zone-z4" : "text-foreground-muted hover:text-foreground"
              }`}
              aria-label={activity.is_brick ? "Unlink brick" : "Link as brick with next session"}
            >
              <Link2 size={12} />
            </button>
          )}
          <button
            onClick={onDelete}
            className="ml-auto rounded-md p-1 text-foreground-muted hover:bg-surface hover:text-discipline-run"
            aria-label="Delete session"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
