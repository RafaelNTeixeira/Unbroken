"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { v4 as uuid } from "uuid";
import { createClient } from "@/lib/supabase/client";
import { toDateKey } from "@/lib/planner/date-utils";
import * as api from "@/lib/planner/api";
import type { CreateActivityInput, UpdateActivityInput, WeekPlan } from "@/lib/planner/types";
import type { PlannedActivityRow } from "@/lib/supabase/database.types";

function weekKey(userId: string | null, weekStart: Date) {
  return ["week-plan", userId, toDateKey(weekStart)] as const;
}

export function useWeekPlan(userId: string | null, weekStart: Date) {
  const supabase = createClient();

  return useQuery({
    queryKey: weekKey(userId, weekStart),
    queryFn: () => api.fetchWeekPlan(supabase, userId as string, weekStart),
    enabled: Boolean(userId),
  });
}

function findActivity(plan: WeekPlan | undefined, id: string): PlannedActivityRow | undefined {
  if (!plan) return undefined;
  for (const day of Object.values(plan)) {
    const found = day.activities.find((a) => a.id === id);
    if (found) return found;
  }
  return undefined;
}

export function usePlannerMutations(userId: string | null, weekStart: Date) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const key = weekKey(userId, weekStart);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["week-plan", userId] });
  }

  const createActivity = useMutation({
    mutationFn: (input: CreateActivityInput) => {
      const plan = queryClient.getQueryData<WeekPlan>(key);
      const displayOrder = plan?.[input.dateKey]?.activities.length ?? 0;
      return api.createActivity(supabase, userId as string, input, displayOrder);
    },
    onSuccess: invalidate,
  });

  const updateActivity = useMutation({
    mutationFn: (input: UpdateActivityInput) => api.updateActivity(supabase, input),
    onSuccess: invalidate,
  });

  const deleteActivity = useMutation({
    mutationFn: (id: string) => api.deleteActivity(supabase, id),
    onSuccess: invalidate,
  });

  const reorderDay = useMutation({
    mutationFn: (updates: { id: string; display_order: number }[]) =>
      api.reorderActivities(supabase, updates),
    onSuccess: invalidate,
  });

  const moveActivity = useMutation({
    mutationFn: ({
      activityId,
      targetDateKey,
      displayOrder,
    }: {
      activityId: string;
      targetDateKey: string;
      displayOrder: number;
    }) => api.moveActivityToDay(supabase, userId as string, activityId, targetDateKey, displayOrder),
    onSuccess: invalidate,
  });

  const toggleBrick = useMutation({
    mutationFn: async ({ firstId, secondId }: { firstId: string; secondId: string }) => {
      const plan = queryClient.getQueryData<WeekPlan>(key);
      const first = findActivity(plan, firstId);
      if (first?.brick_group_id) {
        await api.unlinkBrick(supabase, first.brick_group_id);
      } else {
        await api.linkBrick(supabase, firstId, secondId, uuid());
      }
    },
    onSuccess: invalidate,
  });

  const boltActivity = useMutation({
    mutationFn: (input: CreateActivityInput) => {
      const plan = queryClient.getQueryData<WeekPlan>(key);
      const displayOrder = plan?.[input.dateKey]?.activities.length ?? 0;
      return api.createActivity(supabase, userId as string, input, displayOrder);
    },
    onSuccess: invalidate,
  });

  const unboltActivity = useMutation({
    mutationFn: (id: string) => api.unboltActivity(supabase, id),
    onSuccess: invalidate,
  });

  return {
    createActivity,
    updateActivity,
    deleteActivity,
    reorderDay,
    moveActivity,
    toggleBrick,
    boltActivity,
    unboltActivity,
  };
}
