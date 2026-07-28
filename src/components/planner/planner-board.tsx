"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useAuthUserId } from "@/lib/supabase/use-auth-user";
import { usePlannerMutations, useWeekPlan } from "@/lib/planner/hooks";
import { startOfWeek, getWeekDates, toDateKey } from "@/lib/planner/date-utils";
import { DISCIPLINE_META } from "@/lib/planner/discipline-meta";
import type { Discipline, PlannedActivityRow } from "@/lib/supabase/database.types";
import { WeekNavigator } from "@/components/planner/week-navigator";
import { DisciplinePalette } from "@/components/planner/discipline-palette";
import { DayColumn } from "@/components/planner/day-column";
import { ActivityEditorSheet, draftToPatch, type ActivityDraft } from "@/components/planner/activity-editor-sheet";
import type { WeekPlan } from "@/lib/planner/types";

type EditorState =
  | { mode: "edit"; activity: PlannedActivityRow }
  | { mode: "bolt"; parent: PlannedActivityRow; dateKey: string }
  | null;

function findDateKeyForActivity(plan: WeekPlan | undefined, activityId: string): string | null {
  if (!plan) return null;
  for (const day of Object.values(plan)) {
    if (day.activities.some((a) => a.id === activityId)) return day.dateKey;
  }
  return null;
}

function resolveDayKey(over: DragEndEvent["over"]): string | null {
  if (!over) return null;
  const data = over.data.current as { type?: string; dateKey?: string } | undefined;
  if (data?.type === "day" && data.dateKey) return data.dateKey;
  if (data?.type === "activity" && data.dateKey) return data.dateKey;
  return null;
}

export function PlannerBoard() {
  const userId = useAuthUserId();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const { data: plan, isLoading } = useWeekPlan(userId, weekStart);
  const mutations = usePlannerMutations(userId, weekStart);
  const [editor, setEditor] = useState<EditorState>(null);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current as
      | { type: "palette"; discipline: Discipline }
      | { type: "activity"; dateKey: string }
      | undefined;
    if (!activeData) return;

    const targetDateKey = resolveDayKey(over);
    if (!targetDateKey) return;

    if (activeData.type === "palette") {
      const meta = DISCIPLINE_META[activeData.discipline];
      mutations.createActivity.mutate({
        dateKey: targetDateKey,
        discipline: activeData.discipline,
        title: meta.label,
        targetDurationSec: meta.defaultDurationSec,
      });
      return;
    }

    if (activeData.type === "activity") {
      const activityId = active.id as string;
      const sourceDateKey = findDateKeyForActivity(plan, activityId);
      if (!sourceDateKey) return;

      if (sourceDateKey === targetDateKey) {
        const dayActivities = (plan?.[sourceDateKey]?.activities ?? [])
          .filter((a) => !a.is_bolted)
          .sort((a, b) => a.display_order - b.display_order);
        const oldIndex = dayActivities.findIndex((a) => a.id === activityId);
        const overId = over.id as string;
        const newIndex = dayActivities.findIndex((a) => a.id === overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
        const reordered = arrayMove(dayActivities, oldIndex, newIndex);
        mutations.reorderDay.mutate(reordered.map((a, i) => ({ id: a.id, display_order: i })));
      } else {
        const targetCount = (plan?.[targetDateKey]?.activities ?? []).filter((a) => !a.is_bolted).length;
        mutations.moveActivity.mutate({ activityId, targetDateKey, displayOrder: targetCount });
      }
    }
  }

  function handleSaveEditor(draft: ActivityDraft) {
    const patch = draftToPatch(draft);
    if (editor?.mode === "edit") {
      mutations.updateActivity.mutate({ id: editor.activity.id, ...patch });
    } else if (editor?.mode === "bolt") {
      mutations.boltActivity.mutate({
        dateKey: editor.dateKey,
        discipline: patch.discipline,
        title: patch.title,
        targetDurationSec: patch.targetDurationSec,
        targetDistanceM: patch.targetDistanceM,
        targetZone: patch.targetZone,
        targetTss: patch.targetTss,
        timeOfDay: patch.timeOfDay,
        isBolted: true,
        boltedToActivityId: editor.parent.id,
      });
    }
    setEditor(null);
  }

  if (!userId || isLoading) {
    return <div className="py-16 text-center text-sm text-foreground-muted">Loading your week…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium tracking-tight">Weekly Planner</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Drag a discipline onto any day. Drag sessions to reorder or move them.
          </p>
        </div>
        <WeekNavigator weekStart={weekStart} onChange={setWeekStart} />
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-4 md:flex-row">
          <DisciplinePalette />

          <div className="flex flex-1 gap-2 overflow-x-auto pb-2">
            {weekDates.map((date) => {
              const dateKey = toDateKey(date);
              return (
                <DayColumn
                  key={dateKey}
                  dateKey={dateKey}
                  activities={plan?.[dateKey]?.activities ?? []}
                  onEditActivity={(activity) => setEditor({ mode: "edit", activity })}
                  onDeleteActivity={(id) => mutations.deleteActivity.mutate(id)}
                  onToggleBrick={(firstId, secondId) =>
                    mutations.toggleBrick.mutate({ firstId, secondId })
                  }
                  onBoltActivity={(parent) => setEditor({ mode: "bolt", parent, dateKey })}
                  onUnboltActivity={(id) => mutations.unboltActivity.mutate(id)}
                />
              );
            })}
          </div>
        </div>
      </DndContext>

      {editor?.mode === "edit" && (
        <ActivityEditorSheet
          mode="edit"
          initial={editor.activity}
          title="Edit session"
          onClose={() => setEditor(null)}
          onSave={handleSaveEditor}
          onDelete={() => {
            mutations.deleteActivity.mutate(editor.activity.id);
            setEditor(null);
          }}
        />
      )}

      {editor?.mode === "bolt" && (
        <ActivityEditorSheet
          mode="create"
          defaultDiscipline="strength"
          title={`Bolt onto "${editor.parent.title}"`}
          onClose={() => setEditor(null)}
          onSave={handleSaveEditor}
        />
      )}
    </div>
  );
}
