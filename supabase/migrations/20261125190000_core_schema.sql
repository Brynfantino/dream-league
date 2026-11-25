-- Dream League core schema
-- Source of truth: Dream-League_PRD.md — do not invent rules.
-- Scoring: outfield goals +1 GF; GK club goals conceded +1 GA; points = GF − GA;
-- League order: points, then GF; if still equal, remain tied (PRD §8).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('visitor', 'manager', 'commissioner');

-- Outfield positions only (PRD §3). Goalkeepers are clubs, not player positions.
create type public.player_position as enum ('DEF', 'MID', 'FWD');

create type public.goal_event_type as enum ('outfield_goal', 'gk_conceded');

create type public.transfer_status as enum ('proposed', 'approved', 'rejected', 'cancelled');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date,
  ends_on date,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index seasons_one_active_idx
  on public.seasons (is_active)
  where is_active = true;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role public.user_role not null default 'visitor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dream League franchises (PRD §16 Teams). Managers via team_managers (PRD §2).
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (season_id, name)
);

-- One login per person; a team may have multiple managers (PRD §2).
create table public.team_managers (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  -- null until the person signs up and is linked
  profile_id uuid references public.profiles (id) on delete set null,
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (team_id, display_name)
);

create unique index team_managers_team_profile_uidx
  on public.team_managers (team_id, profile_id)
  where profile_id is not null;

create index team_managers_profile_idx
  on public.team_managers (profile_id)
  where profile_id is not null;

-- Club-based goalkeeper assets (PRD §4, §16). Distinct from outfield players.
create table public.goalkeeper_clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Real-life outfield footballers only (PRD §3, §5). Positions: DEF / MID / FWD.
create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  club text,
  position public.player_position not null,
  created_at timestamptz not null default now()
);

-- Outfield ownership (PRD §16 Team Ownership). Unique active owner per season.
create table public.squad_memberships (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  acquired_at timestamptz not null default now(),
  released_at timestamptz,
  constraint squad_memberships_release_order
    check (released_at is null or released_at >= acquired_at)
);

create unique index squad_memberships_active_player_idx
  on public.squad_memberships (season_id, player_id)
  where released_at is null;

create index squad_memberships_team_idx
  on public.squad_memberships (team_id)
  where released_at is null;

-- Goalkeeper club ownership (PRD §4 unique ownership). One active GK club per team/season.
create table public.goalkeeper_memberships (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  goalkeeper_club_id uuid not null references public.goalkeeper_clubs (id) on delete cascade,
  acquired_at timestamptz not null default now(),
  released_at timestamptz,
  constraint goalkeeper_memberships_release_order
    check (released_at is null or released_at >= acquired_at)
);

create unique index goalkeeper_memberships_active_club_idx
  on public.goalkeeper_memberships (season_id, goalkeeper_club_id)
  where released_at is null;

create unique index goalkeeper_memberships_active_team_idx
  on public.goalkeeper_memberships (season_id, team_id)
  where released_at is null;

-- Scoring source of truth (Bryn + PRD §14): event ledger only.
-- Derive season/league GF, GA, and points from these rows — do not store
-- cumulative goals on players/goalkeeper_clubs or add season aggregate tables.
-- outfield_goal => +1 GF (requires player_id);
-- gk_conceded => +1 GA (requires goalkeeper_club_id).
create table public.goal_events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  event_type public.goal_event_type not null,
  player_id uuid references public.players (id) on delete cascade,
  goalkeeper_club_id uuid references public.goalkeeper_clubs (id) on delete cascade,
  occurred_on date not null,
  notes text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint goal_events_subject_matches_type check (
    (
      event_type = 'outfield_goal'
      and player_id is not null
      and goalkeeper_club_id is null
    )
    or (
      event_type = 'gk_conceded'
      and goalkeeper_club_id is not null
      and player_id is null
    )
  )
);

create index goal_events_season_team_idx
  on public.goal_events (season_id, team_id);

-- Transfer requests (PRD §10). Same-position replace: outfield↔ outfield or GK club ↔ GK club.
create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  proposing_team_id uuid not null references public.teams (id) on delete cascade,
  player_in_id uuid references public.players (id) on delete set null,
  player_out_id uuid references public.players (id) on delete set null,
  goalkeeper_club_in_id uuid references public.goalkeeper_clubs (id) on delete set null,
  goalkeeper_club_out_id uuid references public.goalkeeper_clubs (id) on delete set null,
  status public.transfer_status not null default 'proposed',
  proposed_by uuid not null references public.profiles (id) on delete restrict,
  reviewed_by uuid references public.profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint transfers_one_asset_kind check (
    (
      player_in_id is not null
      and player_out_id is not null
      and goalkeeper_club_in_id is null
      and goalkeeper_club_out_id is null
    )
    or (
      goalkeeper_club_in_id is not null
      and goalkeeper_club_out_id is not null
      and player_in_id is null
      and player_out_id is null
    )
  )
);

create index transfers_status_idx
  on public.transfers (season_id, status);

create table public.cup_ties (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  round_name text not null,
  home_team_id uuid references public.teams (id) on delete set null,
  away_team_id uuid references public.teams (id) on delete set null,
  home_score integer,
  away_score integer,
  played_on date,
  created_at timestamptz not null default now()
);

create table public.honours (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons (id) on delete set null,
  team_id uuid references public.teams (id) on delete set null,
  title text not null,
  season_label text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Auth helpers: create profile on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    'visitor'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Role helpers (security definer to avoid RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_commissioner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'commissioner'
  );
$$;

create or replace function public.is_manager_of_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_managers
    where team_id = p_team_id and profile_id = auth.uid()
  );
$$;

-- Block non-commissioners from changing their own role (RLS policies are OR'd)
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and not public.is_commissioner() then
    raise exception 'Only commissioners can change roles';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_self_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

comment on table public.goalkeeper_clubs is
  'PRD §4 / §16: club-based goalkeeper assets (e.g. Arsenal), distinct from outfield players.';

comment on table public.team_managers is
  'PRD §2: managers of a Dream League team. One profile (login) per person; multiple rows per team allowed.';

comment on table public.players is
  'PRD §3 / §5: outfield players only (DEF, MID, FWD).';
