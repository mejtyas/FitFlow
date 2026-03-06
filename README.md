# FitFlow

Workout logger: custom exercises, custom workouts, live timer, and history with export.

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Supabase (Auth + Postgres)
- Deploy: Railway (or any Node host)

## Setup

1. Copy `.env.example` to `.env` and set:
   - `NEXT_PUBLIC_SUPABASE_URL` – your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` – Supabase publishable key

2. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up or log in, then use Dashboard, Exercises, Workouts, History, and Stats.

## Deploy (Railway)

- Build: `next build`
- Start: `next start`
- Set the same env vars in the Railway project.

## Features

- **Auth**: Email/password sign up and sign in; protected routes.
- **Exercises**: Create and manage your own exercise list (no premade list).
- **Workouts**: Build workouts from your exercises (order + default sets per exercise).
- **Dashboard**: Start a workout from your routines; timer runs from DB `started_at` (persists across refresh/close). Log KG and reps per set; add sets or exercises on the fly; end workout to save.
- **History**: List past workouts with duration; open one for exercise/set details; export all history as CSV or XLSX.
- **Stats**: Total workouts, total time, most used exercises.
- **robots.txt**: Disallows indexing.
