-- Dream League core schema (align with Dream-League_PRD.md — do not invent rules)
-- Scoring: outfield goals +1 GF; GK club goals conceded +1 GA; points = GF − GA;
-- League order: points, then GF; if still equal, remain tied (PRD §8).
-- Note: position enum is currently goalkeeper|outfield; PRD uses DEF/MID/FWD + GK clubs — refine when directed.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('visitor', 'manager', 'commissioner');

create type public.player_position as enum ('goalkeeper', 'outfield');

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

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  name text not null,
  manager_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (season_id, name)
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  club text,
  position public.player_position not null,
  created_at timestamptz not null default now()
);

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

-- A player can only belong to one squad at a time within a season
create unique index squad_memberships_active_player_idx
  on public.squad_memberships (season_id, player_id)
  where released_at is null;

create index squad_memberships_team_idx
  on public.squad_memberships (team_id)
  where released_at is null;

create table public.goal_events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  event_type public.goal_event_type not null,
  -- outfield_goal => +1 GF for team; gk_conceded => +1 GA for team
  occurred_on date not null,
  notes text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index goal_events_season_team_idx
  on public.goal_events (season_id, team_id);

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  proposing_team_id uuid not null references public.teams (id) on delete cascade,
  player_in_id uuid references public.players (id) on delete set null,
  player_out_id uuid references public.players (id) on delete set null,
  status public.transfer_status not null default 'proposed',
  proposed_by uuid not null references public.profiles (id) on delete restrict,
  reviewed_by uuid references public.profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
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
    select 1 from public.teams
    where id = p_team_id and manager_id = auth.uid()
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
