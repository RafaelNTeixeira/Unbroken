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
- **Phase 4 — Intelligent Generator**: constraint-based "Generate Training
  Week" engine + the 11-Hour Ironman Baseline Preset.
- **Phase 5 — Strava Integration**: OAuth token storage, webhook listener,
  auto-reconciliation engine.
- **Phase 6 — Analytics Dashboard**: 80/20 intensity distribution, planned
  vs. completed compliance, CTL/ATL/TSB.

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