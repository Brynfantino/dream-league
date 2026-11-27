-- Cup / BFL historical archive support.
-- Distinguishes Dream League Cup vs BFL Challenge, and allows external
-- opponent labels when the other side is not a Dream League franchise.
-- Source of truth: Dream-League_PRD.md §11 Cup; Bryn 2025/26 import scope.

alter table public.cup_ties
  add column if not exists competition text not null default 'dream_league_cup';

alter table public.cup_ties
  add column if not exists home_name text;

alter table public.cup_ties
  add column if not exists away_name text;

comment on column public.cup_ties.competition is
  'Competition key: dream_league_cup | bfl_challenge';

comment on column public.cup_ties.home_name is
  'Display name when home_team_id is null (external / historical label).';

comment on column public.cup_ties.away_name is
  'Display name when away_team_id is null (external / historical label).';

alter table public.cup_ties
  drop constraint if exists cup_ties_side_identity;

alter table public.cup_ties
  add constraint cup_ties_side_identity check (
    (home_team_id is not null or (home_name is not null and length(trim(home_name)) > 0))
    and
    (away_team_id is not null or (away_name is not null and length(trim(away_name)) > 0))
  );

create index if not exists cup_ties_season_competition_idx
  on public.cup_ties (season_id, competition);
