-- Multi-manager support (PRD §2 + Bryn 2026-11-25):
-- one login per person; a team may have multiple managers.

create table public.team_managers (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  -- null until the person signs up and is linked
  profile_id uuid references public.profiles (id) on delete set null,
  -- spreadsheet / display name used before and after linking
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

-- Backfill from legacy single manager_id when present
insert into public.team_managers (team_id, profile_id, display_name)
select
  t.id,
  t.manager_id,
  coalesce(p.display_name, 'Manager')
from public.teams t
left join public.profiles p on p.id = t.manager_id
where t.manager_id is not null
on conflict (team_id, display_name) do nothing;

-- Membership check: junction table (preferred) or legacy teams.manager_id
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
  )
  or exists (
    select 1 from public.teams
    where id = p_team_id and manager_id = auth.uid()
  );
$$;

alter table public.team_managers enable row level security;

create policy "team_managers_public_read"
  on public.team_managers for select
  to anon, authenticated
  using (true);

create policy "team_managers_commissioner_insert"
  on public.team_managers for insert
  to authenticated
  with check (public.is_commissioner());

create policy "team_managers_commissioner_update"
  on public.team_managers for update
  to authenticated
  using (public.is_commissioner())
  with check (public.is_commissioner());

create policy "team_managers_commissioner_delete"
  on public.team_managers for delete
  to authenticated
  using (public.is_commissioner());

comment on table public.team_managers is
  'Managers of a Dream League team. One profile (login) per person; multiple rows per team allowed.';

comment on column public.teams.manager_id is
  'Deprecated single-manager FK. Prefer team_managers. Kept for backward compatibility.';
