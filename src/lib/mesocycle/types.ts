export interface ProgressionConfig {
  weekly_volume_increase_pct: number;
  deload_every_n_weeks: number | null;
  deload_drop_pct: number;
}

export interface CloneMesocycleInput {
  name: string;
  baseWeekStart: Date;
  weekCount: number;
  progressionEnabled: boolean;
  progressionConfig: ProgressionConfig;
}

export const DEFAULT_PROGRESSION_CONFIG: ProgressionConfig = {
  weekly_volume_increase_pct: 5,
  deload_every_n_weeks: 4,
  deload_drop_pct: 20,
};

// weekOffset is 1-indexed: 1 = the first cloned week after the base week.
export function computeScaleForWeek(weekOffset: number, config: ProgressionConfig): number {
  let scale = 1 + (config.weekly_volume_increase_pct / 100) * weekOffset;

  if (config.deload_every_n_weeks && weekOffset % config.deload_every_n_weeks === 0) {
    scale *= 1 - config.deload_drop_pct / 100;
  }

  return Math.max(scale, 0.1);
}

export function scaleValue(value: number | null, scale: number): number | null {
  if (value === null) return null;
  return Math.round(value * scale);
}
