"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import * as api from "@/lib/logging/api";
import type { LogWorkoutInput, MarkCompleteInput } from "@/lib/logging/types";
import type { Discipline } from "@/lib/supabase/database.types";

export function useWeekCompletionStatus(userId: string | null, plannedActivityIds: string[]) {
  const supabase = createClient();
  const sortedIds = [...plannedActivityIds].sort();

  return useQuery({
    queryKey: ["completion-status", userId, sortedIds],
    queryFn: () => api.fetchWeekCompletionStatus(supabase, userId as string, sortedIds),
    enabled: Boolean(userId) && sortedIds.length > 0,
  });
}

export function useMarkComplete(userId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      planned: {
        id: string;
        discipline: Discipline;
        title: string;
        target_duration_sec: number | null;
        target_distance_m: number | null;
      };
      input: MarkCompleteInput;
    }) => api.markActivityComplete(supabase, userId as string, args.planned, args.input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["completion-status", userId] });
      queryClient.invalidateQueries({ queryKey: ["week-plan", userId] });
    },
  });
}

export function useLogWorkout(userId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LogWorkoutInput) => api.logWorkout(supabase, userId as string, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["completion-status", userId] });
      queryClient.invalidateQueries({ queryKey: ["recent-completed", userId] });
    },
  });
}
