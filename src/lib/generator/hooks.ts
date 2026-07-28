"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { placeGroups } from "@/lib/generator/placement";
import { buildCustomGroups } from "@/lib/generator/custom-generator";
import { buildIronmanBaselineGroups } from "@/lib/generator/ironman-preset";
import { clearWeek, persistPlacements } from "@/lib/generator/api";
import type { GeneratorConstraints } from "@/lib/generator/types";

export interface GenerateWeekInput {
  weekStart: Date;
  mode: "custom" | "ironman";
  constraints: GeneratorConstraints;
  clearFirst: boolean;
}

export interface GenerateWeekResult {
  placedCount: number;
  unplacedCount: number;
}

export function useGenerateWeek(userId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GenerateWeekInput): Promise<GenerateWeekResult> => {
      if (!userId) throw new Error("Not authenticated");

      const groups =
        input.mode === "ironman" ? buildIronmanBaselineGroups() : buildCustomGroups(input.constraints);

      const { placements, unplaced } = placeGroups(
        groups,
        input.weekStart,
        input.constraints.availableDays,
        input.constraints.maxSessionsPerDay
      );

      if (input.clearFirst) {
        await clearWeek(supabase, userId, input.weekStart);
      }

      await persistPlacements(supabase, userId, placements);

      return { placedCount: placements.length, unplacedCount: unplaced.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["week-plan", userId] });
    },
  });
}
