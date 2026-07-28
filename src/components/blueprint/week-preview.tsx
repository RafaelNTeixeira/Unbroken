"use client";

import type { WeekPlan } from "@/lib/planner/types";
import { DISCIPLINE_META } from "@/lib/planner/discipline-meta";
import { formatDayLabel, formatDuration, getWeekDates, toDateKey } from "@/lib/planner/date-utils";

export function WeekPreview({ weekStart, plan }: { weekStart: Date; plan: WeekPlan | undefined }) {
  const dates = getWeekDates(weekStart);
  const totalSessions = Object.values(plan ?? {}).reduce(
    (sum, day) => sum + day.activities.filter((a) => !a.is_bolted).length,
    0
  );

  if (totalSessions === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-foreground-muted">
        This week is empty. Build it out in the Planner first, then come back here to clone it.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {dates.map((date) => {
        const dateKey = toDateKey(date);
        const day = plan?.[dateKey];
        const topLevel = (day?.activities ?? []).filter((a) => !a.is_bolted);
        const { weekday } = formatDayLabel(date);
        const totalSec = topLevel.reduce((s, a) => s + (a.target_duration_sec ?? 0), 0);

        return (
          <div key={dateKey} className="rounded-lg border border-border bg-surface p-2">
            <p className="text-[11px] text-foreground-muted">{weekday}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {topLevel.map((a) => (
                <span
                  key={a.id}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: DISCIPLINE_META[a.discipline].colorVar }}
                  title={a.title}
                />
              ))}
              {topLevel.length === 0 && <span className="text-[11px] text-foreground-muted">—</span>}
            </div>
            {totalSec > 0 && (
              <p className="mt-1 text-[10px] text-foreground-muted">{formatDuration(totalSec)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
