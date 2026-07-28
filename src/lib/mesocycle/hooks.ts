"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import * as api from "@/lib/mesocycle/api";
import type { CloneMesocycleInput } from "@/lib/mesocycle/types";

export function useTrainingBlocks(userId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["training-blocks", userId],
    queryFn: () => api.fetchTrainingBlocks(supabase, userId as string),
    enabled: Boolean(userId),
  });
}

export function useMesocycleMutations(userId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["training-blocks", userId] });
    queryClient.invalidateQueries({ queryKey: ["week-plan", userId] });
  }

  const cloneMesocycle = useMutation({
    mutationFn: (input: CloneMesocycleInput) => api.cloneMesocycle(supabase, userId as string, input),
    onSuccess: invalidate,
  });

  const deleteTrainingBlock = useMutation({
    mutationFn: (id: string) => api.deleteTrainingBlock(supabase, id),
    onSuccess: invalidate,
  });

  return { cloneMesocycle, deleteTrainingBlock };
}
