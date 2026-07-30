# Unbroken

A private, zero-cost triathlon planning and performance-tracking PWA. Built
for one athlete's own multi-discipline training — unbounded sessions per
day, brick and bolted workouts, mesocycle cloning, and manual workout
logging with automatic plan reconciliation — without paying for
TrainingPeaks, Strava Summit, or (as of mid-2026) Strava's now-paywalled API.

## Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS, PWA-installable
- **State**: TanStack Query
- **Charts/icons**: Recharts, Lucide React
- **Backend**: Supabase (Postgres, Auth)
- **Hosting**: Vercel Hobby tier

Everything above runs on permanent free tiers at $0/month, with no
third-party API subscription required.

## Getting started

See **[SETUP.md](./SETUP.md)** for creating your Supabase project and
running the schema migration.

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
- **Phase 5 — Manual Workout Logging & Reconciliation** ✅ Log a completed
  session directly from the Planner (tied to a specific planned session) or
  from the Dashboard (auto-matched against that day's plan) — the same
  reconciliation model the spec describes, without depending on a paid
  third-party API.
- **Phase 6 — Analytics Dashboard** ✅ Fitness/Fatigue (CTL/ATL/TSB), 80/20
  intensity distribution, and planned-vs-completed compliance by discipline —
  all computed client-side from logged data, no third-party dependency.

All six phases from the original spec are now built.

### A note on Strava

An earlier iteration of this project integrated directly with the Strava
API (OAuth, a webhook listener, automatic ingestion). Strava changed its
API terms in mid-2026 to require an active paid subscription for API
access, which conflicts with this project's zero-cost goal, so that
integration was removed in favor of manual logging. The data model
(`completed_activities.strava_id`, `reconciliation_logs`) was deliberately
left compatible with re-adding Strava sync later as an optional extra, if
you'd rather pay for it than log manually.

### Using Analytics (Phase 6)

Three sections, each with its own time-window selector:

- **Fitness & Fatigue**: CTL (Chronic Training Load, 42-day exponentially
  weighted average of daily "load"), ATL (Acute Training Load, 7-day
  version), and Form/TSB (CTL − ATL, computed from the *previous* day so it
  reflects freshness entering each day rather than after that day's
  session). This follows the standard EWMA formula
  (`value += (today − value) / timeConstant`), applied to an estimated load
  per session rather than a real TSS.
- **80/20 Intensity Distribution**: a donut of time spent in Low (Z1–Z2),
  Grey zone (Z3), and Threshold+ (Z4–Z5), compared against the 80/20 target,
  with a specific callout if the grey-zone share creeps above 15% — the
  "easy days aren't easy enough" pattern the spec calls out by name. Only
  sessions logged **against a specific planned session with a target zone**
  count here; ad-hoc logs without a matched zone are excluded and shown as
  a separate "unclassified" total rather than silently guessed at.
- **Volume & Frequency Compliance**: planned vs. completed hours (bar
  chart) and session counts (table) per discipline, over the last 4/8/12
  weeks.

**How "load" is estimated** (documented, not a real TSS — see
`src/lib/analytics/types.ts`): `hours × intensityFactor² × 100`. When a
session has both average watts and an FTP set in Settings, intensity factor
is `avgWatts / FTP` (a proxy for normalized-power-based TSS, using average
power since manual entry doesn't have a power stream to normalize). Without
power, it falls back to a zone-based intensity factor — the session's
matched planned target zone if it has one, otherwise a per-discipline
default (e.g. strength defaults to Z3, mobility to Z1). This is a
transparent relative-trend proxy, not a substitute for a real power meter
or a validated HR-based TRIMP model.

**Known limitation**: CTL/ATL necessarily start at zero and ramp up from
whenever you started logging in this app — there's no historical import,
so the first ~42 days of the Fitness chart will read lower than your actual
fitness if you were already trained going in. This is inherent to not
having prior training history, not a bug.

### Using manual logging (Phase 5)

- **From the Planner**: hover a session card and click the circle icon
  (left of the pencil) to mark it complete. Enter actual duration and
  (optionally) distance, average HR, and average watts. This links directly
  to that planned session — no guessing involved.
- **From the Dashboard**: use the "Log a workout" form for anything not
  tied to a specific planned session. It tries to auto-match against that
  day's plan the same way the mark-complete flow does (same discipline,
  closest duration among unmatched candidates), and files itself as
  `unplanned_extra` if nothing fits.
- Either way, matches land in `reconciliation_logs` with duration variance,
  distance variance, and a power-adherence percentage (based on your FTP
  from Settings). The Dashboard's "Recently logged" list shows a checkmark
  once something's matched, and flags any of the last 7 days' planned
  sessions that haven't been logged yet.

**Known, deliberate simplifications:**
- `heartrate_decoupling_pct` is always `null` — true Pw:Hr decoupling needs
  time-series stream data that manual entry can't provide. A good Phase 6
  addition if you start capturing HR streams some other way.
- "Missed" sessions are **derived at read time** on the Dashboard, not
  written to `reconciliation_logs` with `status = 'missed'`. Doing that for
  real requires knowing the day is over, which needs either a scheduled job
  (`pg_cron`, available on Supabase's free tier) or a client-side sweep —
  kept zero-infrastructure for now.
- Auto-matching by closest duration is a heuristic — if you log two runs of
  similar length on the same day, the second one might match the "wrong"
  planned session. Rows are visible and correctable directly in the
  `reconciliation_logs` table if that happens; using the Planner's
  mark-complete flow avoids the ambiguity entirely since it's unambiguous
  about which session it's for.

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
  lib/logging/                       # manual completion logging + reconciliation
  lib/query/                         # TanStack Query provider
supabase/migrations/0001_init.sql    # full schema + RLS policies
```
