import type { Discipline, TrainingZone } from "@/lib/supabase/database.types";

export const DISCIPLINES: Discipline[] = ["swim", "bike", "run", "strength", "mobility"];

export const DISCIPLINE_META: Record<
  Discipline,
  { label: string; shortLabel: string; colorVar: string; defaultDurationSec: number }
> = {
  swim: { label: "Swim", shortLabel: "SWM", colorVar: "var(--discipline-swim)", defaultDurationSec: 3600 },
  bike: { label: "Bike", shortLabel: "BIKE", colorVar: "var(--discipline-bike)", defaultDurationSec: 3600 },
  run: { label: "Run", shortLabel: "RUN", colorVar: "var(--discipline-run)", defaultDurationSec: 2700 },
  strength: {
    label: "Strength",
    shortLabel: "STR",
    colorVar: "var(--discipline-strength)",
    defaultDurationSec: 1800,
  },
  mobility: {
    label: "Mobility",
    shortLabel: "MOB",
    colorVar: "var(--discipline-mobility)",
    defaultDurationSec: 900,
  },
  other: { label: "Other", shortLabel: "OTH", colorVar: "var(--foreground-muted)", defaultDurationSec: 1800 },
};

export const ZONE_META: Record<TrainingZone, { label: string; colorVar: string }> = {
  z1: { label: "Z1 Recovery", colorVar: "var(--zone-z1)" },
  z2: { label: "Z2 Aerobic", colorVar: "var(--zone-z2)" },
  z3: { label: "Z3 Tempo", colorVar: "var(--zone-z3)" },
  z4: { label: "Z4 Threshold", colorVar: "var(--zone-z4)" },
  z5: { label: "Z5 VO2/Anaerobic", colorVar: "var(--zone-z5)" },
  rest: { label: "Rest", colorVar: "var(--foreground-muted)" },
};
