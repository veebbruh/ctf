-- Geminathon-CTF: challenges and leaderboard tables
-- Run this in Supabase Dashboard → SQL Editor, or via: supabase db push
-- No profiles/teams table; add later when you have data to differentiate teams.

-- Challenges: one row per CTF challenge
create table if not exists public.challenges (
  id text primary key,
  title text not null,
  category text not null check (category in ('Forensics', 'Web', 'Crypto', 'Reverse', 'Misc')),
  description text not null,
  base_points int not null,
  flag text not null,
  hints jsonb not null default '["", ""]',
  hint_times jsonb not null default '[900000, 1800000]',
  file_url text,
  created_at timestamptz default now()
);

comment on table public.challenges is 'CTF challenges; app falls back to built-in list if empty.';
comment on column public.challenges.hint_times is 'Milliseconds from round start when hint 1 and hint 2 unlock.';

-- Leaderboard: one row per player (player_id = browser UUID from app)
create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  player_id text unique not null,
  username text not null,
  score int not null default 0,
  solved_count int not null default 0,
  last_solve_time bigint,
  updated_at timestamptz default now()
);

comment on table public.leaderboard is 'Scores per player; upserted by app on solve. No profiles/teams yet.';

-- RLS: allow anon key to read challenges and read/write leaderboard
alter table public.challenges enable row level security;
alter table public.leaderboard enable row level security;

drop policy if exists "Allow read challenges" on public.challenges;
create policy "Allow read challenges" on public.challenges
  for select using (true);

drop policy if exists "Allow all leaderboard" on public.leaderboard;
create policy "Allow all leaderboard" on public.leaderboard
  for all using (true) with check (true);
