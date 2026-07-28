import type { Discipline, TrainingZone } from "@/lib/supabase/database.types";

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface GeneratorConstraints {
  availableDays: Weekday[];
  maxSessionsPerDay: number;
  targetWeeklyHours: number;
}

export interface SlotSession {
  discipline: Discipline;
  title: string;
  durationSec: number;
  distanceM?: number;
  targetZone?: TrainingZone;
  targetTss?: number;
}

// One atomic placement unit for a single day: a primary session, an optional
// brick partner that must land on the same day immediately after it, and any
// number of sessions bolted onto the primary.
export interface SlotGroup {
  id: string;
  primary: SlotSession;
  brickPartner?: SlotSession;
  bolted?: SlotSession[];
}

export interface Placement {
  dateKey: string;
  group: SlotGroup;
}

export interface PlacementResult {
  placements: Placement[];
  unplaced: SlotGroup[];
}
