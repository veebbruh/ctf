# Geminathon-CTF

A Capture The Flag (CTF) event platform: timed challenges, flag submission, hints, and a live leaderboard. **Think. Break. Capture.**

## Features

- **Homepage** — Event branding, CTF categories, and entry to the arena
- **Challenge arena** — Start a 60-minute timer, view challenges by category, open individual challenge pages
- **Challenges** — Description, optional file download, two time-gated hints, and flag submission with point decay
- **Leaderboard** — Live scores; syncs with Supabase when configured
- **Supabase** — Optional: load challenges from DB, persist leaderboard
- **Firebase** — Optional: Auth, Firestore, Storage (configure via env)

## Tech stack

- **Vite** — Build and dev server
- **TypeScript** — Typed JavaScript
- **React** + **React Router** — UI and routing
- **Tailwind CSS** + **shadcn-ui** — Styling and components
- **Framer Motion** — Animations
- **Supabase** — Backend (challenges, leaderboard)
- **Firebase** — Optional auth and realtime

## Prerequisites

- **Node.js** (LTS recommended) and **npm**  
  Install via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) or [nodejs.org](https://nodejs.org).

## Quick start

```bash
# Clone the repo
git clone <YOUR_GIT_URL>
cd ctf-arena-builder-main

# Install dependencies
npm install

# Start the dev server (with hot reload)
npm run dev
```

Open the URL shown in the terminal (e.g. `http://localhost:5173`).

## Environment variables

Create a `.env` file in the project root.

### Supabase (recommended for challenges + leaderboard)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous (public) API key |

On app load, the browser console will show **Supabase connection OK** or an error if the connection fails.

### Firebase (optional)

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain (e.g. `project.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Analytics measurement ID (optional) |

If any required Firebase vars are missing, the app still runs; Firebase features are simply disabled.

## Supabase setup

The app expects **challenges**, **competition_config**, and **leaderboard**. If challenges are missing or empty, it falls back to built-in challenges and local-only leaderboard.

### Table: `challenges`

| Column | Type | Notes |
|--------|------|--------|
| `id` | text | Primary key (e.g. `forensics-1`) |
| `title` | text | Challenge title |
| `category` | text | One of: `Forensics`, `Web`, `Crypto`, `Reverse`, `Misc` |
| `description` | text | Full description (supports `\n` and “File: filename”) |
| `base_points` | integer | Base score before time/hint deductions |
| `flag` | text | Correct flag (e.g. `FLAG{...}`) |
| `hints` | jsonb | Array of 2 strings: `["hint1", "hint2"]` |
| `hint_times` | jsonb | Array of 2 numbers (milliseconds when hints unlock): `[300000, 600000]` |
| `file_url` | text | Optional; URL or path for challenge attachment |

### Table: `leaderboard`

| Column | Type | Notes |
|--------|------|--------|
| `player_id` | text | Unique per browser (UUID); **must be UNIQUE** for upsert |
| `username` | text | Display name (e.g. “You” or team name) |
| `score` | integer | Total score |
| `solved_count` | integer | Number of challenges solved |
| `last_solve_time` | bigint / number | Optional; timestamp (ms) of last solve |
| `updated_at` | timestamptz | Optional; set by app on upsert |

The app uses **upsert** with `onConflict: "player_id"`, so ensure a unique constraint (or primary key) on `player_id`.

### Table: `competition_config`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid | Primary key |
| `key` | text | Unique (e.g. `'default'`) |
| `event_name` | text | e.g. `'Geminathon-CTF'` |
| `duration_seconds` | int | Round length (e.g. `3600`) |
| `started_at` | timestamptz | Optional; set when event starts |
| `created_at`, `updated_at` | timestamptz | Optional |

### Applying the schema and seed data

Migrations and seed live in **`supabase/migrations/`**. Run them in order:

1. **`20250302000000_create_ctf_tables.sql`** — creates `challenges` and `leaderboard`
2. **`20250302000001_create_competition_config.sql`** — creates `competition_config`
3. **`20250302000002_seed_challenges_and_config.sql`** — seeds **challenges** (3 Forensics challenges) and **competition_config** (one row: event name, duration). **leaderboard** stays empty until players submit flags.

**Dashboard:** Open your project → **SQL Editor**, then run each file above in order.  
**CLI:** From the repo root: `npx supabase link --project-ref YOUR_REF` then `npx supabase db push`.

No profiles or teams table yet; add those when you have data to differentiate teams.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Production build (output in `dist/`) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |

## Project structure (overview)

- `src/pages/` — Index (home), Dashboard, ChallengePage, Leaderboard, NotFound
- `src/components/` — DashboardLayout, TaskCard, CountdownTimer, AnimatedGrid, AdminControl, UI (shadcn)
- `src/hooks/useGameState.ts` — Timer, challenges state, flag submission, score; loads challenges from Supabase when available
- `src/data/challenges.ts` — Default challenge list (used when Supabase has no challenges)
- `src/lib/supabase.ts` — Supabase client and connection test
- `src/lib/firebase.ts` — Firebase init (optional)
- `src/lib/api.ts` — Supabase API helpers (challenges, leaderboard, player id, connection test)

## Deploying

1. Set environment variables in your hosting platform (Vercel, Netlify, etc.) for `VITE_SUPABASE_*` and optionally `VITE_FIREBASE_*`.
2. Build: `npm run build`.
3. Serve the `dist/` folder (static hosting or your preferred method).

### Netlify

- **Build command:** `npm run build`  
- **Publish directory:** `dist`  
- **Functions:** `netlify/functions` (timer start/reset backend)  
- **Environment variables (required for team login & leaderboard):** In Netlify → Site → Site configuration → Environment variables, add:
  - `VITE_SUPABASE_URL` = your Supabase project URL  
  - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key  

- **Timer backend (so the clock starts for everyone when admin clicks “Initialize System Timer”):** Add these **server-side** variables (not prefixed with `VITE_`; they are used only by Netlify Functions):
  - `SUPABASE_URL` = same as your Supabase project URL (e.g. `https://xxxx.supabase.co`)  
  - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase **service role** key (Dashboard → Project Settings → API). Keep this secret; it bypasses RLS.

If the timer backend env vars are missing, the admin can still start the timer from the client (Supabase anon update); the backend is preferred so the server sets the authoritative time and all participants see the same countdown.

Redeploy after adding or changing variables so they are available at build time. Without these, the app runs but team login and leaderboard sync show a “temporarily unavailable” message.

For custom domains and CI/CD, follow your host’s documentation.

## License

Use and modify as needed for your CTF event.
