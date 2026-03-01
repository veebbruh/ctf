-- Ensure competition_config has columns expected by the seed (fix if table existed with different schema)
alter table public.competition_config
  add column if not exists event_name text not null default 'Geminathon-CTF',
  add column if not exists duration_seconds int not null default 3600,
  add column if not exists started_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();
