"use client";

import { useState } from "react";
import { useAuthUserId } from "@/lib/supabase/use-auth-user";
import { useLogWorkout } from "@/lib/logging/hooks";
import { DISCIPLINES, DISCIPLINE_META } from "@/lib/planner/discipline-meta";
import { toDateKey } from "@/lib/planner/date-utils";
import type { Discipline } from "@/lib/supabase/database.types";

export function LogWorkoutForm() {
  const userId = useAuthUserId();
  const logWorkout = useLogWorkout(userId);

  const [discipline, setDiscipline] = useState<Discipline>("run");
  const [title, setTitle] = useState("");
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()));
  const [durationMin, setDurationMin] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    logWorkout.mutate(
      {
        discipline,
        title: title.trim() || DISCIPLINE_META[discipline].label,
        dateKey,
        movingTimeSec: Math.round((Number(durationMin) || 0) * 60),
        distanceM: distanceKm ? Math.round(Number(distanceKm) * 1000) : null,
        averageHeartrate: null,
        averageWatts: null,
      },
      {
        onSuccess: ({ matched }) => {
          setFeedback(
            matched
              ? "Logged and matched to today's plan."
              : "Logged — no matching planned session found, so it's recorded as extra."
          );
          setTitle("");
          setDurationMin("");
          setDistanceKm("");
        },
        onError: () => setFeedback("Something went wrong logging that — try again."),
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {DISCIPLINES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDiscipline(d)}
            className={`rounded-lg border px-2 py-1.5 text-xs ${
              discipline === d
                ? "border-foreground bg-surface-raised"
                : "border-border text-foreground-muted hover:bg-surface"
            }`}
          >
            {DISCIPLINE_META[d].label}
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={`${DISCIPLINE_META[discipline].label} session`}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2"
      />

      <div className="grid grid-cols-3 gap-2">
        <input
          type="date"
          value={dateKey}
          onChange={(e) => setDateKey(e.target.value)}
          className="rounded-lg border border-border bg-surface px-2 py-2 text-sm outline-none focus-visible:outline-2"
        />
        <input
          type="number"
          min={0}
          placeholder="min"
          value={durationMin}
          onChange={(e) => setDurationMin(e.target.value)}
          className="rounded-lg border border-border bg-surface px-2 py-2 text-sm outline-none focus-visible:outline-2"
        />
        <input
          type="number"
          min={0}
          step="0.1"
          placeholder="km"
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value)}
          className="rounded-lg border border-border bg-surface px-2 py-2 text-sm outline-none focus-visible:outline-2"
        />
      </div>

      <button
        type="submit"
        disabled={logWorkout.isPending || !durationMin}
        className="w-full rounded-lg bg-discipline-bike px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
      >
        {logWorkout.isPending ? "Logging…" : "Log workout"}
      </button>

      {feedback && <p className="text-xs text-foreground-muted">{feedback}</p>}
    </form>
  );
}
