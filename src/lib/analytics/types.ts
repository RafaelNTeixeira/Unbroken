import type { Discipline, TrainingZone } from "@/lib/supabase/database.types";

export interface LoadPoint {
  dateKey: string;
  load: number;
  ctl: number;
  atl: number;
  tsb: number;
}

export interface ZoneDistribution {
  lowSec: number; // z1 + z2
  greySec: number; // z3
  highSec: number; // z4 + z5
  unclassifiedSec: number; // no zone info available
}

export interface DisciplineCompliance {
  discipline: Discipline;
  plannedHours: number;
  completedHours: number;
  plannedCount: number;
  completedCount: number;
}

// Session load is not a real TSS calculation (that needs normalized power
// or a validated HR-based TRIMP model) — it's a transparent proxy: hours *
// intensity_factor^2 * 100, which is the same shape as TSS's dependence on
// intensity, applied either to actual avg-watts/FTP when available or to a
// zone-based estimate otherwise. Good enough for a relative fitness/fatigue
// trend line; not a substitute for a real power meter + normalized power.
export const ZONE_INTENSITY_FACTOR: Record<TrainingZone, number> = {
  z1: 0.5,
  z2: 0.65,
  z3: 0.8,
  z4: 0.9,
  z5: 1.05,
  rest: 0,
};

export const DEFAULT_ZONE_BY_DISCIPLINE: Record<Discipline, TrainingZone> = {
  swim: "z2",
  bike: "z2",
  run: "z2",
  strength: "z3",
  mobility: "z1",
  other: "z2",
};

export function estimateSessionLoad(
  movingTimeSec: number | null,
  averageWatts: number | null,
  ftpWatts: number | null,
  discipline: Discipline,
  matchedZone: TrainingZone | null
): number {
  const hours = (movingTimeSec ?? 0) / 3600;
  if (hours <= 0) return 0;

  if (averageWatts && ftpWatts) {
    const intensityFactor = averageWatts / ftpWatts;
    return hours * intensityFactor * intensityFactor * 100;
  }

  const zone = matchedZone ?? DEFAULT_ZONE_BY_DISCIPLINE[discipline];
  const factor = ZONE_INTENSITY_FACTOR[zone] ?? 0.6;
  return hours * factor * factor * 100;
}

export function zoneBucket(zone: TrainingZone): "low" | "grey" | "high" {
  if (zone === "z1" || zone === "z2") return "low";
  if (zone === "z3") return "grey";
  return "high";
}
