# Sherly Technical Interview Sprint

A Next.js App Router version of the 42-day technical interview preparation tracker. Progress, notes, timers, streaks, filters, and completion state are persisted through a server-side Supabase API route.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase Persistence

Create a table for the tracker state:

```sql
create table interview_tracker_progress (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
```

Set these environment variables on the server:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Optional overrides:

```bash
SUPABASE_PROGRESS_TABLE=interview_tracker_progress
SUPABASE_PROGRESS_ID=default
```

If Supabase is not configured, the app still loads with in-memory progress for the current session.

## Production Build

```bash
npm run build
npm run start
```

## Verification

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run e2e
```

## Install as an App

Deploy the built app to an HTTPS host such as Vercel or Netlify, configure the Supabase environment variables, open it on your phone, then use the browser's Add to Home Screen or Install App action.
