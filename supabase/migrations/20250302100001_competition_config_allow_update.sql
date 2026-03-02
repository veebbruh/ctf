-- Allow clients (e.g. admin panel) to set/clear competition start time
drop policy if exists "Allow update competition_config" on public.competition_config;
create policy "Allow update competition_config" on public.competition_config
  for update using (true) with check (true);
