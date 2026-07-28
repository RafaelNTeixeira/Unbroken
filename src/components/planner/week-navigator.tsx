"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, formatWeekRange, startOfWeek } from "@/lib/planner/date-utils";

export function WeekNavigator({
  weekStart,
  onChange,
}: {
  weekStart: Date;
  onChange: (date: Date) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(addDays(weekStart, -7))}
        className="rounded-lg border border-border p-1.5 hover:bg-surface"
        aria-label="Previous week"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-[150px] text-center text-sm font-medium">
        {formatWeekRange(weekStart)}
      </span>
      <button
        onClick={() => onChange(addDays(weekStart, 7))}
        className="rounded-lg border border-border p-1.5 hover:bg-surface"
        aria-label="Next week"
      >
        <ChevronRight size={16} />
      </button>
      <button
        onClick={() => onChange(startOfWeek(new Date()))}
        className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground-muted hover:bg-surface hover:text-foreground"
      >
        Today
      </button>
    </div>
  );
}
