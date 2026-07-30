# Setup Guide

This gets you from zero to a running, authenticated app with a live
database. No third-party API accounts needed — workout completion is
logged manually, so the whole thing runs at the $0 the spec asked for.

## 1. Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (GitHub login is fastest).
2. Click **New project**. Pick any org, name it (e.g. `unbroken`), set a database
   password (save it somewhere — you won't need it day-to-day, but you'll want
   it if you ever connect via `psql`), and choose the region closest to you.
3. Wait ~2 minutes for provisioning.
4. In the project, go to **Project Settings → Data API**. Copy:
   - **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key (under **API Keys**) → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → this is `SUPABASE_SERVICE_ROLE_KEY` (keep this one
     secret — it bypasses RLS. Nothing in the current app calls it yet, but
     it's good to have on hand.)

## 2. Run the schema migration

1. In the Supabase dashboard, open **SQL Editor**.
2. Open `supabase/migrations/0001_init.sql` from this project, copy its full
   contents, paste into a new query, and run it.
3. Confirm it worked: go to **Table Editor** — you should see `users`,
   `training_blocks`, `planned_days`, `planned_activities`,
   `completed_activities`, and `reconciliation_logs`.

   Alternatively, if you have the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
   installed, you can link the project and run `supabase db push` instead of
   pasting into the SQL editor.

> **If you previously ran `0002_strava_token_encryption.sql`** while trying
> out the earlier Strava-based version of this project: that's fine to leave
> in place. It's now unused — nothing in the app calls those functions or
> reads the (now-bytea) token columns — but it's inert and doesn't need to
> be rolled back.

## 3. Configure email auth (default is fine to start)

Supabase Auth's email/password provider is on by default — no action needed
for local development. If you want to disable "Confirm email" while testing
(so sign-up logs you in immediately instead of requiring an email click):

- **Authentication → Providers → Email** → toggle off **Confirm email**.
  Turn it back on before sharing this with anyone else.

## 4. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` from step 1.

> **Why `@supabase/supabase-js` and `@supabase/ssr` are pinned to exact
> versions** in `package.json`: newer releases (supabase-js 2.7x+) changed
> how the generated `Database` type is expected to be shaped (an
> `__InternalSupabase` marker), and as of this writing that change has an
> open upstream bug that makes `.update()`/`.insert()` calls type as `never`
> even with correctly-shaped hand-written or CLI-generated types. If you
> upgrade these packages later, re-run `npx tsc --noEmit` first — if it
> breaks, either stay pinned or check the Supabase changelog for a fix.

## 5. Run it locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` → you'll land on `/login`. Sign up, confirm
your email if you left confirmation on, then you should see the dashboard
shell with empty states for the Planner and Analytics — Analytics comes
online in Phase 6. Try editing your profile on the **Settings** page and
confirming the values persist after a refresh; that round-trip is the real
test that auth + RLS + the DB are wired correctly.

## 6. Deploying for free (when you're ready)

- Push this repo to GitHub.
- Go to [vercel.com](https://vercel.com), **New Project**, import the repo.
- Vercel auto-detects Next.js. Add the same env vars from `.env.local`
  (except keep `SUPABASE_SERVICE_ROLE_KEY` server-only — Vercel's env var
  UI handles that correctly by default since it's not prefixed `NEXT_PUBLIC_`).
- Deploy. The Hobby tier covers this comfortably at zero cost.

## 7. Try the manual logging flow

1. Build a session for today in the **Planner**.
2. Hover the session card and click the circle icon (left of the pencil) to
   mark it complete — enter actual duration/distance/HR/watts.
3. Check the **Dashboard**: the session now shows a checkmark, and there's
   a "Recently logged" list. You can also log a workout that *isn't* tied
   to a specific planned session from the Dashboard's "Log a workout" form
   — it'll try to auto-match against that day's plan the same way, and file
   itself as "extra" if nothing fits.

---

**Next:** once you can log in, edit your profile, and see it persist, you're
ready to explore the Planner and Blueprint.
