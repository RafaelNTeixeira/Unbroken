import type { Discipline } from "@/lib/supabase/database.types";

export interface ActualEffort {
  movingTimeSec: number;
  distanceM: number | null;
  averageHeartrate: number | null;
  averageWatts: number | null;
}

// Logged directly against a specific planned session (from the Planner).
export interface MarkCompleteInput extends ActualEffort {
  plannedActivityId: string;
  dateKey: string;
}

// A free-standing log not tied to a specific planned session (from the
// Dashboard) — the engine tries to auto-match it to that day's plan the
// same way the old Strava webhook did, and falls back to "unplanned_extra".
export interface LogWorkoutInput extends ActualEffort {
  dateKey: string;
  discipline: Discipline;
  title: string;
}

export interface LogWorkoutResult {
  matched: boolean;
}
