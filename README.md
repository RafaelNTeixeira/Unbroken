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
- **Phase 2 — Manual Planner Core**: unbounded daily sessions, drag-and-drop
  weekly builder, Brick Linker, Bolted Sessions.
- **Phase 3 — Mesocycle Cloning**: X-week replicator with a progression
  toggle (volume/intensity scaling, deload weeks).
- **Phase 4 — Intelligent Generator**: constraint-based "Generate Training
  Week" engine + the 11-Hour Ironman Baseline Preset.
- **Phase 5 — Strava Integration**: OAuth token storage, webhook listener,
  auto-reconciliation engine.
- **Phase 6 — Analytics Dashboard**: 80/20 intensity distribution, planned
  vs. completed compliance, CTL/ATL/TSB.

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
