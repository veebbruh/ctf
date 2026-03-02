-- Enable Realtime for competition_config so all clients get timer start/reset instantly
alter publication supabase_realtime add table public.competition_config;
