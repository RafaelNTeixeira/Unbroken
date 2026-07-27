-- ============================================================================
-- Unbroken — Initial Schema (Phase 1)
-- Decoupled calendar-day / activity model supporting unbounded sessions/day,
-- brick linking, bolted sessions, mesocycle cloning, and Strava reconciliation.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------

create type discipline as enum ('swim', 'bike', 'run', 'strength', 'mobility', 'other');
create type training_zone as enum ('z1', 'z2', 'z3', 'z4', 'z5', 'rest');
create type reconciliation_status as enum ('pending', 'matched', 'missed', 'unplanned_extra');

-- ----------------------------------------------------------------------------
-- USERS (extends Supabase auth.users 1:1)
-- ----------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  ftp_watts integer,                     -- bike functional threshold power
  threshold_pace_run_sec_per_km integer, -- run threshold pace
  threshold_pace_swim_sec_per_100m integer,
  max_sessions_per_day integer not null default 3,
  default_available_days jsonb not null default '["mon","tue","wed","thu","fri","sat","sun"]',
  strava_athlete_id bigint unique,
  strava_access_token text,              -- stored encrypted at rest via Supabase Vault in production
  strava_refresh_token text,
  strava_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TRAINING BLOCKS (mesocycles)
-- ----------------------------------------------------------------------------

create table public.training_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,                    -- e.g. "12-Week Custom Build"
  start_date date not null,
  end_date date not null,
  progression_enabled boolean not null default false,
  progression_config jsonb,              -- e.g. {"weekly_volume_increase_pct":5,"deload_every_n_weeks":4,"deload_drop_pct":20}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint end_after_start check (end_date >= start_date)
);

create index idx_training_blocks_user on public.training_blocks (user_id);

-- ----------------------------------------------------------------------------
-- PLANNED DAYS — one row per calendar date within a block
-- ----------------------------------------------------------------------------

create table public.planned_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  training_block_id uuid references public.training_blocks (id) on delete cascade,
  calendar_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, calendar_date)
);

create index idx_planned_days_user_date on public.planned_days (user_id, calendar_date);

-- ----------------------------------------------------------------------------
-- PLANNED ACTIVITIES — 0..N per planned_day (never a fixed count)
-- ----------------------------------------------------------------------------

create table public.planned_activities (
  id uuid primary key default gen_random_uuid(),
  planned_day_id uuid not null references public.planned_days (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  discipline discipline not null,
  title text not null,
  target_duration_sec integer,
  target_distance_m integer,
  target_zone training_zone,
  target_tss numeric,
  is_brick boolean not null default false,       -- true if this session is linked to the next one same day
  brick_group_id uuid,                            -- shared id across all sessions in a brick chain
  is_bolted boolean not null default false,       -- true if bolted onto a preceding primary session
  bolted_to_activity_id uuid references public.planned_activities (id) on delete cascade,
  display_order integer not null default 0,       -- sequences sessions within the same day
  time_of_day time,                               -- optional planned start time
  structure jsonb,                                -- free-form interval/step structure
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_planned_activities_day on public.planned_activities (planned_day_id, display_order);
create index idx_planned_activities_user on public.planned_activities (user_id);
create index idx_planned_activities_brick_group on public.planned_activities (brick_group_id);

-- ----------------------------------------------------------------------------
-- COMPLETED ACTIVITIES — raw/parsed data ingested from Strava
-- ----------------------------------------------------------------------------

create table public.completed_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  strava_id bigint unique,
  discipline discipline not null,
  name text,
  started_at timestamptz not null,
  moving_time_sec integer,
  elapsed_time_sec integer,
  distance_m numeric,
  average_heartrate numeric,
  max_heartrate numeric,
  average_watts numeric,
  normalized_power numeric,
  average_pace_sec_per_km numeric,
  tss numeric,
  raw_payload jsonb,                              -- full Strava payload for future re-parsing
  created_at timestamptz not null default now()
);

create index idx_completed_activities_user_date on public.completed_activities (user_id, started_at);
create index idx_completed_activities_strava_id on public.completed_activities (strava_id);

-- ----------------------------------------------------------------------------
-- RECONCILIATION LOGS — join table: planned <-> completed
-- ----------------------------------------------------------------------------

create table public.reconciliation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  planned_activity_id uuid references public.planned_activities (id) on delete cascade,
  completed_activity_id uuid references public.completed_activities (id) on delete cascade,
  status reconciliation_status not null default 'pending',
  duration_variance_sec integer,
  distance_variance_m numeric,
  power_adherence_pct numeric,
  heartrate_decoupling_pct numeric,
  matched_at timestamptz,
  created_at timestamptz not null default now(),
  unique (planned_activity_id, completed_activity_id)
);

create index idx_reconciliation_user on public.reconciliation_logs (user_id);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger trg_training_blocks_updated_at before update on public.training_blocks
  for each row execute function public.set_updated_at();
create trigger trg_planned_activities_updated_at before update on public.planned_activities
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security — every user only ever sees their own rows
-- ----------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.training_blocks enable row level security;
alter table public.planned_days enable row level security;
alter table public.planned_activities enable row level security;
alter table public.completed_activities enable row level security;
alter table public.reconciliation_logs enable row level security;

create policy "users_select_own" on public.users for select using (auth.uid() = id);
create policy "users_update_own" on public.users for update using (auth.uid() = id);
create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);

create policy "training_blocks_all_own" on public.training_blocks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "planned_days_all_own" on public.planned_days for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "planned_activities_all_own" on public.planned_activities for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "completed_activities_all_own" on public.completed_activities for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reconciliation_logs_all_own" on public.reconciliation_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Auto-create a public.users row whenever someone signs up via Supabase Auth
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
