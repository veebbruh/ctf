# Supabase setup for Geminathon-CTF

Tables: **challenges**, **competition_config**, and **leaderboard**. No profiles or teams table for now (add when you have data to differentiate teams).

## Apply migrations (in order)

Run these in the **SQL Editor** in order, or use Supabase CLI so all migrations apply:

1. `20250302000000_create_ctf_tables.sql` — creates `challenges` and `leaderboard`
2. `20250302000001_create_competition_config.sql` — creates `competition_config`
3. `20250302000002_seed_challenges_and_config.sql` — seeds challenges and one config row

### Option A: Supabase Dashboard

1. Open your project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor**.
3. Run each migration file above (copy-paste and Execute).

### Option B: Supabase CLI

From the project root:

```bash
npx supabase link --project-ref YOUR_REF
npx supabase db push
```

## What gets created

- **`challenges`** — Seeded with 3 Forensics challenges (same as built-in). Add or edit rows in Table Editor or SQL.
- **`competition_config`** — One row: `key = 'default'`, `event_name = 'Geminathon-CTF'`, `duration_seconds = 3600`. Use for event settings later.
- **`leaderboard`** — Empty. The app upserts rows when players submit flags (keyed by `player_id`). No profiles/teams data yet.
