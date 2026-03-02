# Supabase setup for Geminathon-CTF

Tables: **challenges**, **competition_config**, **leaderboard**, and **team_credentials**.

## Apply migrations (in order)

Run these in the **SQL Editor** in order, or use Supabase CLI so all migrations apply:

1. `20250302000000_create_ctf_tables.sql` — creates `challenges` and `leaderboard`
2. `20250302000001_create_competition_config.sql` — creates `competition_config`
3. `20250302000003_competition_config_add_columns.sql` — adds columns if `competition_config` existed with different schema
4. `20250302000002_seed_challenges_and_config.sql` — seeds challenges and one config row
5. `20250302000004_team_credentials.sql` — creates `team_credentials`
6. `20250302000005_seed_team_credentials.sql` — seeds team credentials (from Geminathon 26 Team Formation CSV)

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
- **`leaderboard`** — Empty. The app upserts rows when players submit flags (keyed by `player_id`).
- **`team_credentials`** — One row per team from **Geminathon 26 Team Formation (Responses) (1).csv**: `team_username` = team name, `team_name` = team name, `password` = generated (e.g. `G26` + 8 random alphanumeric). Use for team login.

## Regenerating team credentials

To regenerate passwords and re-seed from the CSV (e.g. after adding teams):

```bash
node scripts/seed-team-credentials.js
```

Then run the new `20250302000005_seed_team_credentials.sql` in the SQL Editor (it will overwrite existing rows via `on conflict (team_username) do update`). The script also writes `scripts/output/team-credentials.csv` (team_username, password) for distribution; that folder is gitignored.
