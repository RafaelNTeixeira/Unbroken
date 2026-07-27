# Setup Guide — Phase 1

This gets you from zero to a running, authenticated app with a live database.
Strava steps are included now so the `users` table has somewhere to put the
tokens, but the actual ingestion pipeline doesn't ship until Phase 5 — you
won't use these credentials for anything functional yet.

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
     secret — it bypasses RLS. It isn't used until Phase 5's webhook function.)

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
`SUPABASE_SERVICE_ROLE_KEY` from step 1. Leave the `STRAVA_*` vars blank for
now unless you're doing step 6 below.

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
shell with empty states for the Planner, Strava connection, and Analytics —
those come online in later phases. Try editing your profile on the
**Settings** page and confirming the values persist after a refresh; that
round-trip is the real test that auth + RLS + the DB are wired correctly.

## 6. (Optional now, required for Phase 5) Register a Strava API application

1. Log into Strava, go to **[strava.com/settings/api](https://www.strava.com/settings/api)**.
2. Click **Create App** (or **Create & Manage Your App**).
3. Fill in:
   - **Application Name**: `Unbroken` (or anything)
   - **Category**: whatever fits (e.g. "Training")
   - **Website**: your Vercel URL once deployed, or `http://localhost:3000` for now
   - **Authorization Callback Domain**: `localhost` for local dev. When you
     deploy, you'll add your production domain here too — Strava only allows
     one at a time, so you'll need to update this before testing on Vercel.
4. After creation, copy the **Client ID** and **Client Secret** into
   `.env.local` as `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET`.
5. Nothing in the app uses these yet — the connect flow, webhook listener,
   and token storage are built in Phase 5.

## 7. Deploying for free (when you're ready)

- Push this repo to GitHub.
- Go to [vercel.com](https://vercel.com), **New Project**, import the repo.
- Vercel auto-detects Next.js. Add the same env vars from `.env.local`
  (except keep `SUPABASE_SERVICE_ROLE_KEY` server-only — Vercel's env var
  UI handles that correctly by default since it's not prefixed `NEXT_PUBLIC_`).
- Deploy. The Hobby tier covers this comfortably at zero cost.
- Once deployed, update Strava's **Authorization Callback Domain** to your
  Vercel domain when you reach Phase 5.

---

**Next:** once you can log in, edit your profile, and see it persist, you're
ready for Phase 2 — the drag-and-drop Weekly Planner.
