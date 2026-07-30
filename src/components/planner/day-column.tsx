"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { PlannedActivityRow, ReconciliationStatus } from "@/lib/supabase/database.types";
import { ActivityCard } from "@/components/planner/activity-card";
import { formatDayLabel, formatDuration, isToday, parseDateKey } from "@/lib/planner/date-utils";

export function DayColumn({
  dateKey,
  activities,
  completionStatus,
  onEditActivity,
  onDeleteActivity,
  onToggleBrick,
  onBoltActivity,
  onUnboltActivity,
  onMarkComplete,
}: {
  dateKey: string;
  activities: PlannedActivityRow[];
  completionStatus: Map<string, ReconciliationStatus>;
  onEditActivity: (activity: PlannedActivityRow) => void;
  onDeleteActivity: (id: string) => void;
  onToggleBrick: (firstId: string, secondId: string) => void;
  onBoltActivity: (parent: PlannedActivityRow) => void;
  onUnboltActivity: (id: string) => void;
  onMarkComplete: (activity: PlannedActivityRow) => void;
}) {
  const date = parseDateKey(dateKey);
  const { weekday, day } = formatDayLabel(date);
  const today = isToday(date);

  const { setNodeRef, isOver } = useDroppable({ id: dateKey, data: { type: "day", dateKey } });

  const topLevel = activities
    .filter((a) => !a.is_bolted)
    .sort((a, b) => a.display_order - b.display_order);
  const boltedByParent = new Map<string, PlannedActivityRow[]>();
  for (const a of activities) {
    if (a.is_bolted && a.bolted_to_activity_id) {
      const list = boltedByParent.get(a.bolted_to_activity_id) ?? [];
      list.push(a);
      boltedByParent.set(a.bolted_to_activity_id, list);
    }
  }

  const totalSec = topLevel.reduce((sum, a) => sum + (a.target_duration_sec ?? 0), 0);

  function combinedBrickSummary(activity: PlannedActivityRow): string | null {
    if (!activity.is_brick || !activity.brick_group_id) return null;
    const group = topLevel.filter((a) => a.brick_group_id === activity.brick_group_id);
    const isFirstInGroup = group[0]?.id === activity.id;
    if (!isFirstInGroup || group.length < 2) return null;
    const totalDur = group.reduce((s, a) => s + (a.target_duration_sec ?? 0), 0);
    const totalTss = group.reduce((s, a) => s + (a.target_tss ?? 0), 0);
    const bits = [formatDuration(totalDur) || null, totalTss ? `${totalTss} TSS combined` : null].filter(
      Boolean
    );
    return `Brick total: ${bits.join(" · ")}`;
  }

  return (
    <div className="flex min-w-[190px] flex-1 flex-col">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-sm font-medium ${today ? "text-foreground" : "text-foreground-muted"}`}>
            {weekday}
          </span>
          <span
            className={`text-sm ${
              today
                ? "flex h-5 w-5 items-center justify-center rounded-full bg-discipline-bike text-black"
                : "text-foreground-muted"
            }`}
          >
            {day}
          </span>
        </div>
        {totalSec > 0 && (
          <span className="text-[11px] text-foreground-muted">{formatDuration(totalSec)}</span>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[140px] flex-1 flex-col gap-2 rounded-2xl border p-2 transition-colors ${
          isOver ? "border-discipline-bike bg-surface" : "border-border/60 bg-surface/40"
        }`}
      >
        <SortableContext items={topLevel.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          {topLevel.length === 0 && (
            <p className="px-2 py-3 text-center text-[11px] text-foreground-muted">Drop a session</p>
          )}
          {topLevel.map((activity, i) => {
            const next = topLevel[i + 1];
            return (
              <ActivityCard
                key={activity.id}
                activity={activity}
                dateKey={dateKey}
                boltedChildren={boltedByParent.get(activity.id) ?? []}
                brickPartnerTitle={
                  activity.is_brick
                    ? topLevel.find(
                        (a) => a.id !== activity.id && a.brick_group_id === activity.brick_group_id
                      )?.title ?? null
                    : null
                }
                combinedBrickSummary={combinedBrickSummary(activity)}
                completionStatus={completionStatus.get(activity.id)}
                onEdit={() => onEditActivity(activity)}
                onDelete={() => onDeleteActivity(activity.id)}
                canLinkBrickWithNext={Boolean(next)}
                onToggleBrickWithNext={
                  activity.is_brick
                    ? () => onToggleBrick(activity.id, activity.id)
                    : next
                    ? () => onToggleBrick(activity.id, next.id)
                    : null
                }
                onBolt={() => onBoltActivity(activity)}
                onUnbolt={onUnboltActivity}
                onMarkComplete={() => onMarkComplete(activity)}
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
}
