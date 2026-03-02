-- Dummy team "dumdum" for testing the point system
-- Log in with: Team name = dumdum, Password = dumdum123
insert into public.team_credentials (team_username, team_name, password)
values ('dumdum', 'dumdum', 'dumdum123')
on conflict (team_username) do update set
  team_name = excluded.team_name,
  password = excluded.password;
