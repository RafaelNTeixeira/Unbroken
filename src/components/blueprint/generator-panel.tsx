"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthUserId } from "@/lib/supabase/use-auth-user";
import { useGenerateWeek } from "@/lib/generator/hooks";
import { WEEKDAYS, type Weekday } from "@/lib/generator/types";
import { startOfWeek } from "@/lib/planner/date-utils";
import { WeekNavigator } from "@/components/planner/week-navigator";

const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

function useProfileDefaults(userId: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["profile-defaults", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("default_available_days, max_sessions_per_day")
        .eq("id", userId as string)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId),
  });
}

export function GeneratorPanel() {
  const userId = useAuthUserId();
  const { data: defaults } = useProfileDefaults(userId);
  const generateWeek = useGenerateWeek(userId);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [mode, setMode] = useState<"custom" | "ironman">("custom");
  const [availableDays, setAvailableDays] = useState<Weekday[]>([...WEEKDAYS]);
  const [maxSessionsPerDay, setMaxSessionsPerDay] = useState(2);
  const [targetWeeklyHours, setTargetWeeklyHours] = useState(8);
  const [clearFirst, setClearFirst] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (defaults?.default_available_days) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time seed of editable local state from an async profile fetch, not a sync loop
      setAvailableDays(defaults.default_available_days as Weekday[]);
    }
    if (defaults?.max_sessions_per_day) {
      setMaxSessionsPerDay(defaults.max_sessions_per_day);
    }
  }, [defaults]);

  function toggleDay(day: Weekday) {
    setAvailableDays((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
    );
  }

  function handleGenerate() {
    setFeedback(null);
    generateWeek.mutate(
      {
        weekStart,
        mode,
        clearFirst,
        constraints: { availableDays, maxSessionsPerDay, targetWeeklyHours },
      },
      {
        onSuccess: ({ placedCount, unplacedCount }) => {
          setFeedback(
            unplacedCount > 0
              ? `Placed ${placedCount} sessions. ${unplacedCount} couldn't fit — try more available days or a higher max sessions/day.`
              : `Placed ${placedCount} sessions into that week. Check the Planner to fine-tune.`
          );
        },
        onError: () => setFeedback("Something went wrong generating the week — try again."),
      }
    );
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Target week</h2>
        <WeekNavigator weekStart={weekStart} onChange={setWeekStart} />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setMode("custom")}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
            mode === "custom"
              ? "border-foreground bg-surface-raised"
              : "border-border text-foreground-muted hover:bg-surface"
          }`}
        >
          Custom generator
        </button>
        <button
          onClick={() => setMode("ironman")}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
            mode === "ironman"
              ? "border-foreground bg-surface-raised"
              : "border-border text-foreground-muted hover:bg-surface"
          }`}
        >
          11-Hour Ironman Baseline
        </button>
      </div>

      <div>
        <label className="mb-1.5 block text-sm text-foreground-muted">Available days</label>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((day) => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                availableDays.includes(day)
                  ? "border-foreground bg-surface-raised"
                  : "border-border text-foreground-muted hover:bg-surface"
              }`}
            >
              {WEEKDAY_LABELS[day]}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid gap-3 ${mode === "custom" ? "grid-cols-2" : "grid-cols-1"}`}>
        <div>
          <label className="mb-1 block text-sm text-foreground-muted">Max sessions / day</label>
          <input
            type="number"
            min={1}
            max={6}
            value={maxSessionsPerDay}
            onChange={(e) => setMaxSessionsPerDay(Number(e.target.value) || 1)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2"
          />
        </div>
        {mode === "custom" && (
          <div>
            <label className="mb-1 block text-sm text-foreground-muted">Target weekly hours</label>
            <input
              type="number"
              min={1}
              step="0.5"
              value={targetWeeklyHours}
              onChange={(e) => setTargetWeeklyHours(Number(e.target.value) || 1)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2"
            />
          </div>
        )}
      </div>

      {mode === "ironman" && (
        <p className="rounded-lg border border-border bg-surface p-3 text-xs text-foreground-muted">
          2x swim (~2h), 2x bike (~5h), 3x run (~3h) with one run bricking off the long ride,
          and 2x strength bolted onto the tempo run and the aerobic swim — fixed volume,
          reflowed across whichever days you mark available above.
        </p>
      )}

      <label className="flex items-center gap-2 text-sm text-foreground-muted">
        <input
          type="checkbox"
          checked={clearFirst}
          onChange={(e) => setClearFirst(e.target.checked)}
          className="h-4 w-4 accent-[var(--discipline-bike)]"
        />
        Clear this week&apos;s existing sessions first
      </label>

      <button
        onClick={handleGenerate}
        disabled={generateWeek.isPending || availableDays.length === 0}
        className="w-full rounded-lg bg-discipline-bike px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
      >
        {generateWeek.isPending
          ? "Generating…"
          : mode === "ironman"
          ? "Apply Ironman Baseline"
          : "Generate Training Week"}
      </button>

      {feedback && <p className="text-sm text-foreground-muted">{feedback}</p>}
    </div>
  );
}
