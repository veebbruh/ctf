-- Team credentials for Geminathon 26 CTF: team username (team name) + password per team
create table if not exists public.team_credentials (
  id uuid primary key default gen_random_uuid(),
  team_username text unique not null,
  team_name text not null,
  password text not null,
  created_at timestamptz default now()
);

comment on table public.team_credentials is 'CTF team login: team name as username, generated password per team.';

alter table public.team_credentials enable row level security;

-- Allow read for login check; restrict insert/update to service or app logic
drop policy if exists "Allow read team_credentials" on public.team_credentials;
create policy "Allow read team_credentials" on public.team_credentials
  for select using (true);

-- Allow insert so seed script or migration can populate (or use service role)
drop policy if exists "Allow insert team_credentials" on public.team_credentials;
create policy "Allow insert team_credentials" on public.team_credentials
  for insert with check (true);
