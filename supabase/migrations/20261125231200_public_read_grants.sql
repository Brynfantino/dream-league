-- Public read privileges for league data (PRD §13 read-only surfaces).
-- RLS policies alone are not enough: anon/authenticated need GRANT SELECT.
-- Matches *_public_read policies in 20261125190100_rls_policies.sql.
-- Idempotent: re-running GRANT is safe.

grant usage on schema public to anon, authenticated;

grant select on table public.seasons to anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant select on table public.teams to anon, authenticated;
grant select on table public.team_managers to anon, authenticated;
grant select on table public.goalkeeper_clubs to anon, authenticated;
grant select on table public.players to anon, authenticated;
grant select on table public.squad_memberships to anon, authenticated;
grant select on table public.goalkeeper_memberships to anon, authenticated;
grant select on table public.goal_events to anon, authenticated;
grant select on table public.transfers to anon, authenticated;
grant select on table public.cup_ties to anon, authenticated;
grant select on table public.honours to anon, authenticated;
