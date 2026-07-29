"use client";

import { useState } from "react";
import { useAuthUserId } from "@/lib/supabase/use-auth-user";
import { useWeekPlan } from "@/lib/planner/hooks";
import { useMesocycleMutations, useTrainingBlocks } from "@/lib/mesocycle/hooks";
import { startOfWeek } from "@/lib/planner/date-utils";
import { WeekNavigator } from "@/components/planner/week-navigator";
import { WeekPreview } from "@/components/blueprint/week-preview";
import { CloneMesocycleForm } from "@/components/blueprint/clone-mesocycle-form";
import { TrainingBlocksList } from "@/components/blueprint/training-blocks-list";
import type { ProgressionConfig } from "@/lib/mesocycle/types";

export function MesocyclePanel() {
  const userId = useAuthUserId();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const { data: plan, isLoading } = useWeekPlan(userId, weekStart);
  const { data: blocks } = useTrainingBlocks(userId);
  const { cloneMesocycle, deleteTrainingBlock } = useMesocycleMutations(userId);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const totalSessions = Object.values(plan ?? {}).reduce(
    (sum, day) => sum + day.activities.filter((a) => !a.is_bolted).length,
    0
  );

  function handleClone(args: {
    name: string;
    weekCount: number;
    progressionEnabled: boolean;
    progressionConfig: ProgressionConfig;
  }) {
    setFeedback(null);
    cloneMesocycle.mutate(
      { ...args, baseWeekStart: weekStart },
      {
        onSuccess: () =>
          setFeedback({
            type: "success",
            message: `Cloned "${args.name}" across ${args.weekCount} weeks. Check the Planner to review it.`,
          }),
        onError: () =>
          setFeedback({
            type: "error",
            message: "Something went wrong while cloning. Nothing was left half-written for that step — try again.",
          }),
      }
    );
  }

  if (!userId) return null;

  return (
    <div className="space-y-8">
      <p className="text-sm text-foreground-muted">
        Pick a week you&apos;ve already built as a template, then replicate it forward with
        optional progressive overload.
      </p>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">1. Choose a template week</h2>
          <WeekNavigator weekStart={weekStart} onChange={setWeekStart} />
        </div>
        {isLoading ? (
          <p className="text-sm text-foreground-muted">Loading…</p>
        ) : (
          <WeekPreview weekStart={weekStart} plan={plan} />
        )}
      </section>

      <section className="max-w-lg space-y-3">
        <h2 className="text-sm font-medium">2. Configure the mesocycle</h2>
        <CloneMesocycleForm
          weekStart={weekStart}
          disabled={totalSessions === 0}
          isPending={cloneMesocycle.isPending}
          onSubmit={handleClone}
        />
        {feedback && (
          <p
            className={`text-sm ${
              feedback.type === "success" ? "text-discipline-mobility" : "text-discipline-run"
            }`}
          >
            {feedback.message}
          </p>
        )}
      </section>

      <section className="max-w-lg space-y-3">
        <h2 className="text-sm font-medium">Existing mesocycles</h2>
        <TrainingBlocksList
          blocks={blocks ?? []}
          onDelete={(id) => deleteTrainingBlock.mutate(id)}
        />
      </section>
    </div>
  );
}
