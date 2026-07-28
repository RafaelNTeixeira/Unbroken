import type { PlannedActivityRow } from "@/lib/supabase/database.types";

export interface DayPlan {
  dateKey: string;
  plannedDayId: string | null;
  activities: PlannedActivityRow[];
}

export type WeekPlan = Record<string, DayPlan>;

export interface CreateActivityInput {
  dateKey: string;
  discipline: PlannedActivityRow["discipline"];
  title: string;
  targetDurationSec?: number | null;
  targetDistanceM?: number | null;
  targetZone?: PlannedActivityRow["target_zone"];
  targetTss?: number | null;
  timeOfDay?: string | null;
  isBolted?: boolean;
  boltedToActivityId?: string | null;
}

export interface UpdateActivityInput {
  id: string;
  title?: string;
  targetDurationSec?: number | null;
  targetDistanceM?: number | null;
  targetZone?: PlannedActivityRow["target_zone"] | null;
  targetTss?: number | null;
  timeOfDay?: string | null;
  discipline?: PlannedActivityRow["discipline"];
}
