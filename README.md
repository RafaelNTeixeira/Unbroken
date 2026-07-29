# Unbroken

A private, zero-cost triathlon planning and performance-tracking PWA. Built
for one athlete's own multi-discipline training — unbounded sessions per
day, brick and bolted workouts, mesocycle cloning, and automatic Strava
reconciliation — without paying for TrainingPeaks or Strava Summit.

## Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS, PWA-installable
- **State**: TanStack Query
- **Charts/icons**: Recharts, Lucide React
- **Backend**: Supabase (Postgres, Auth, Edge Functions)
- **Hosting**: Vercel Hobby tier
- **Ingestion**: Strava API via webhooks → Supabase Edge Functions

Everything above runs on permanent free tiers at $0/month.

## Getting started

See **[SETUP.md](./SETUP.md)** for creating your Supabase project, running
the schema migration, and (optionally, for later) registering a Strava API
app.

```bash
npm install
cp .env.local.example .env.local   # then fill in Supabase keys
npm run dev
```

## Build phases

- **Phase 1 — Foundation** ✅ Next.js/Supabase scaffold, full relational
  schema with RLS, auth, app shell.
- **Phase 2 — Manual Planner Core** ✅ Drag-and-drop weekly builder
  (`@dnd-kit`), unbounded sessions per day, Brick Linker with combined
  duration/TSS, Bolted Sessions rendered as a unified block, cross-day
  drag-to-move, dashboard "Today" card wired to real data.
- **Phase 3 — Mesocycle Cloning** ✅ Blueprint page: pick any built week as a
  template, preview it, and clone it across N weeks with an optional
  progression toggle (compounding weekly % increase + automatic deload every
  N weeks). Brick pairs and bolted sessions are preserved in every clone.
- **Phase 4 — Intelligent Generator** ✅ Constraint-based "Generate Training
  Week" engine (available days, max sessions/day, target weekly hours) and a
  one-click 11-Hour Ironman Baseline Preset, sharing one placement engine so
  both reflow correctly across whichever days are actually available.
- **Phase 5 — Strava Integration** ✅ Real OAuth connect/disconnect flow,
  tokens encrypted at rest via `pgcrypto`, a Supabase Edge Function webhook
  listener, and an auto-reconciliation engine matching completed activities
  against the plan.
- **Phase 6 — Analytics Dashboard**: 80/20 intensity distribution, planned
  vs. completed compliance, CTL/ATL/TSB.

### Using Strava sync (Phase 5)

Full setup (Strava app registration, Edge Function deployment, webhook
registration, end-to-end test) is in `SETUP.md` steps 6–10. Once connected:

- New Strava activities are ingested within seconds via the
  `strava-webhook` Edge Function (`supabase/functions/strava-webhook`).
- The reconciliation engine matches a completed activity to a planned
  session on the same calendar date with the same discipline, choosing
  whichever open (unmatched) candidate has the closest target duration.
  Matches are recorded in `reconciliation_logs` with duration variance,
  distance variance, and a power-adherence percentage (based on your FTP
  from Settings).
- The Dashboard's Strava card shows your last 5 synced activities (with a
  checkmark once matched) and flags any of the last 7 days' planned
  sessions that haven't matched anything yet.

**Known, deliberate simplifications** (documented rather than silently
approximated):
- `heartrate_decoupling_pct` is always `null`. True Pw:Hr decoupling needs
  time-series stream data (Strava's `/activities/{id}/streams` endpoint),
  not the activity summary this function fetches. A good Phase 6 addition
  if you want it.
- "Missed" sessions are **derived at read time** on the Dashboard, not
  written to `reconciliation_logs` with `status = 'missed'`. Marking
  something missed for real requires knowing the day is over, which needs
  either a scheduled job (`pg_cron`, available on Supabase's free tier) or
  a client-side sweep — I chose to keep this zero-infrastructure for now
  rather than add a cron dependency; happy to add one if you'd rather have
  it persisted.
- Matching same-day/same-discipline by closest duration is a heuristic, not
  a guarantee — if you log two runs of similar length on the same day, the
  second to sync may match the "wrong" one. Reconciliation rows are visible
  and correctable directly in the `reconciliation_logs` table if that ever
  happens.
- Tokens are encrypted with `pgcrypto` using a key that lives only in your
  server env vars (`STRAVA_TOKEN_ENCRYPTION_KEY`) — real protection against
  a raw database leak, though not a substitute for Supabase Vault if you
  want key rotation/audit logging later.

### Using the Generator (Phase 4)

- On the Blueprint page's **Generate a week** tab, pick a target week, tick
  the days you're actually available, set a max sessions/day cap, and either:
  - **Custom generator**: give a target weekly hour count. It splits that
    roughly 20/40/30/10 across swim/bike/run/strength (typical triathlon
    volume distribution), turns each share into a session count using
    realistic average session lengths, and round-robins them across your
    available days — capping automatically if your capacity is too small to
    fit everything (you'll see how many sessions didn't fit).
  - **11-Hour Ironman Baseline**: applies the fixed 2 swim / 2 bike / 3 run /
    2 bolted-strength structure from the spec, with the long ride and its
    brick run always kept on the same day. If you mark fewer days available,
    it reflows the same 9 sessions into a tighter week instead of assuming
    a fixed Mon–Sun layout.
- Both modes share a "clear this week's existing sessions first" option, and
  both write straight into the same `planned_activities` table the Planner
  and Blueprint cloning use — so anything generated is immediately editable,
  drag-and-droppable, and clonable like any hand-built week.

### Using the Blueprint (Phase 3)

- Navigate to the week you want to use as a template (must have at least one
  session), name the mesocycle, set how many weeks total (including that
  template week), and optionally tune the progression settings.
- Progression scales **every** session's duration/distance/TSS by a
  compounding weekly percentage, with an automatic pullback every N weeks —
  a deliberate simplification of the spec's "add 15 minutes to the long run"
  example, which would require tagging a specific session as "the long run."
  If you want that finer control later, it's a natural Phase 3.1 addition.
- Deleting a mesocycle removes only the weeks it generated — the original
  template week is never touched, since it existed before the clone and may
  still be in use elsewhere.

### Using the Planner (Phase 2)

- Drag a discipline block from the left palette onto any day to add a
  session with sensible defaults, then click the pencil icon to fine-tune
  title, duration, distance, zone, TSS, and time of day.
- Drag the grip handle on a session to reorder it within a day, or drop it
  on a different day to move it.
- Click the link icon on a session to brick-link it with the next session
  that day (e.g. bike → run); the combined duration/TSS shows automatically.
  Click again to unlink.
- Click the `+` icon on a session to bolt a short secondary session (e.g.
  core work) onto it — it renders nested inside the parent card instead of
  taking its own slot.

## Project structure

```
src/
  app/
    (auth)/login, (auth)/sign-up     # unauthenticated routes
    auth/callback                    # Supabase email-confirmation redirect
    (app)/dashboard, planner, ...    # authenticated shell + pages
  components/shell/                  # sidebar, header, mobile tab bar
  lib/supabase/                      # client/server/middleware helpers + types
  lib/query/                         # TanStack Query provider
supabase/migrations/0001_init.sql    # full schema + RLS policies
```
