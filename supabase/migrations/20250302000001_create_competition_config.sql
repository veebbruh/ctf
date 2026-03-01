-- competition_config: single-row (or few rows) config for the CTF event
create table if not exists public.competition_config (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  event_name text not null default 'Geminathon-CTF',
  duration_seconds int not null default 3600,
  started_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.competition_config is 'CTF event config (name, duration, start time). One row per competition or use key = default.';

alter table public.competition_config enable row level security;
drop policy if exists "Allow read competition_config" on public.competition_config;
create policy "Allow read competition_config" on public.competition_config
  for select using (true);
