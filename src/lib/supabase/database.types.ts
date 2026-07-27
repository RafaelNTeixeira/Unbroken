// Hand-maintained types mirroring supabase/migrations/0001_init.sql.
// Once the Supabase CLI is linked, regenerate with:
//   supabase gen types typescript --project-id <your-project-id> > src/lib/supabase/database.types.ts

export type Discipline = "swim" | "bike" | "run" | "strength" | "mobility" | "other";
export type TrainingZone = "z1" | "z2" | "z3" | "z4" | "z5" | "rest";
export type ReconciliationStatus = "pending" | "matched" | "missed" | "unplanned_extra";

export interface UserRow {
  id: string;
  display_name: string | null;
  ftp_watts: number | null;
  threshold_pace_run_sec_per_km: number | null;
  threshold_pace_swim_sec_per_100m: number | null;
  max_sessions_per_day: number;
  default_available_days: string[];
  strava_athlete_id: number | null;
  strava_access_token: string | null;
  strava_refresh_token: string | null;
  strava_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingBlockRow {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  progression_enabled: boolean;
  progression_config: {
    weekly_volume_increase_pct?: number;
    deload_every_n_weeks?: number;
    deload_drop_pct?: number;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface PlannedDayRow {
  id: string;
  user_id: string;
  training_block_id: string | null;
  calendar_date: string;
  notes: string | null;
  created_at: string;
}

export interface PlannedActivityRow {
  id: string;
  planned_day_id: string;
  user_id: string;
  discipline: Discipline;
  title: string;
  target_duration_sec: number | null;
  target_distance_m: number | null;
  target_zone: TrainingZone | null;
  target_tss: number | null;
  is_brick: boolean;
  brick_group_id: string | null;
  is_bolted: boolean;
  bolted_to_activity_id: string | null;
  display_order: number;
  time_of_day: string | null;
  structure: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface CompletedActivityRow {
  id: string;
  user_id: string;
  strava_id: number | null;
  discipline: Discipline;
  name: string | null;
  started_at: string;
  moving_time_sec: number | null;
  elapsed_time_sec: number | null;
  distance_m: number | null;
  average_heartrate: number | null;
  max_heartrate: number | null;
  average_watts: number | null;
  normalized_power: number | null;
  average_pace_sec_per_km: number | null;
  tss: number | null;
  raw_payload: unknown | null;
  created_at: string;
}

export interface ReconciliationLogRow {
  id: string;
  user_id: string;
  planned_activity_id: string | null;
  completed_activity_id: string | null;
  status: ReconciliationStatus;
  duration_variance_sec: number | null;
  distance_variance_m: number | null;
  power_adherence_pct: number | null;
  heartrate_decoupling_pct: number | null;
  matched_at: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: Partial<UserRow>;
        Update: Partial<UserRow>;
        Relationships: [];
      };
      training_blocks: {
        Row: TrainingBlockRow;
        Insert: Partial<TrainingBlockRow>;
        Update: Partial<TrainingBlockRow>;
        Relationships: [];
      };
      planned_days: {
        Row: PlannedDayRow;
        Insert: Partial<PlannedDayRow>;
        Update: Partial<PlannedDayRow>;
        Relationships: [];
      };
      planned_activities: {
        Row: PlannedActivityRow;
        Insert: Partial<PlannedActivityRow>;
        Update: Partial<PlannedActivityRow>;
        Relationships: [];
      };
      completed_activities: {
        Row: CompletedActivityRow;
        Insert: Partial<CompletedActivityRow>;
        Update: Partial<CompletedActivityRow>;
        Relationships: [];
      };
      reconciliation_logs: {
        Row: ReconciliationLogRow;
        Insert: Partial<ReconciliationLogRow>;
        Update: Partial<ReconciliationLogRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
