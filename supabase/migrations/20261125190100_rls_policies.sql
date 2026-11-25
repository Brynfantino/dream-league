-- Row Level Security
-- Public read for league data; manager write for own transfer proposals;
-- commissioner write for goals / approvals / admin.

alter table public.seasons enable row level security;
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.squad_memberships enable row level security;
alter table public.goal_events enable row level security;
alter table public.transfers enable row level security;
alter table public.cup_ties enable row level security;
alter table public.honours enable row level security;

-- ---------------------------------------------------------------------------
-- seasons
-- ---------------------------------------------------------------------------

create policy "seasons_public_read"
  on public.seasons for select
  to anon, authenticated
  using (true);

create policy "seasons_commissioner_insert"
  on public.seasons for insert
  to authenticated
  with check (public.is_commissioner());

create policy "seasons_commissioner_update"
  on public.seasons for update
  to authenticated
  using (public.is_commissioner())
  with check (public.is_commissioner());

create policy "seasons_commissioner_delete"
  on public.seasons for delete
  to authenticated
  using (public.is_commissioner());

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy "profiles_public_read"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "profiles_self_update"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
  -- Role changes for non-commissioners are blocked by prevent_role_self_escalation()

create policy "profiles_commissioner_update"
  on public.profiles for update
  to authenticated
  using (public.is_commissioner())
  with check (public.is_commissioner());

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------

create policy "teams_public_read"
  on public.teams for select
  to anon, authenticated
  using (true);

create policy "teams_commissioner_insert"
  on public.teams for insert
  to authenticated
  with check (public.is_commissioner());

create policy "teams_commissioner_update"
  on public.teams for update
  to authenticated
  using (public.is_commissioner())
  with check (public.is_commissioner());

create policy "teams_commissioner_delete"
  on public.teams for delete
  to authenticated
  using (public.is_commissioner());

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------

create policy "players_public_read"
  on public.players for select
  to anon, authenticated
  using (true);

create policy "players_commissioner_insert"
  on public.players for insert
  to authenticated
  with check (public.is_commissioner());

create policy "players_commissioner_update"
  on public.players for update
  to authenticated
  using (public.is_commissioner())
  with check (public.is_commissioner());

create policy "players_commissioner_delete"
  on public.players for delete
  to authenticated
  using (public.is_commissioner());

-- ---------------------------------------------------------------------------
-- squad_memberships
-- ---------------------------------------------------------------------------

create policy "squad_memberships_public_read"
  on public.squad_memberships for select
  to anon, authenticated
  using (true);

create policy "squad_memberships_commissioner_insert"
  on public.squad_memberships for insert
  to authenticated
  with check (public.is_commissioner());

create policy "squad_memberships_commissioner_update"
  on public.squad_memberships for update
  to authenticated
  using (public.is_commissioner())
  with check (public.is_commissioner());

create policy "squad_memberships_commissioner_delete"
  on public.squad_memberships for delete
  to authenticated
  using (public.is_commissioner());

-- ---------------------------------------------------------------------------
-- goal_events (commissioner write)
-- ---------------------------------------------------------------------------

create policy "goal_events_public_read"
  on public.goal_events for select
  to anon, authenticated
  using (true);

create policy "goal_events_commissioner_insert"
  on public.goal_events for insert
  to authenticated
  with check (public.is_commissioner());

create policy "goal_events_commissioner_update"
  on public.goal_events for update
  to authenticated
  using (public.is_commissioner())
  with check (public.is_commissioner());

create policy "goal_events_commissioner_delete"
  on public.goal_events for delete
  to authenticated
  using (public.is_commissioner());

-- ---------------------------------------------------------------------------
-- transfers
-- Manager: propose / cancel own proposals for own team
-- Commissioner: approve / reject / admin
-- ---------------------------------------------------------------------------

create policy "transfers_public_read"
  on public.transfers for select
  to anon, authenticated
  using (true);

create policy "transfers_manager_insert"
  on public.transfers for insert
  to authenticated
  with check (
    proposed_by = auth.uid()
    and status = 'proposed'
    and public.is_manager_of_team(proposing_team_id)
  );

create policy "transfers_manager_cancel"
  on public.transfers for update
  to authenticated
  using (
    proposed_by = auth.uid()
    and status = 'proposed'
    and public.is_manager_of_team(proposing_team_id)
  )
  with check (
    proposed_by = auth.uid()
    and status = 'cancelled'
    and public.is_manager_of_team(proposing_team_id)
  );

create policy "transfers_commissioner_insert"
  on public.transfers for insert
  to authenticated
  with check (public.is_commissioner());

create policy "transfers_commissioner_update"
  on public.transfers for update
  to authenticated
  using (public.is_commissioner())
  with check (public.is_commissioner());

create policy "transfers_commissioner_delete"
  on public.transfers for delete
  to authenticated
  using (public.is_commissioner());

-- ---------------------------------------------------------------------------
-- cup_ties
-- ---------------------------------------------------------------------------

create policy "cup_ties_public_read"
  on public.cup_ties for select
  to anon, authenticated
  using (true);

create policy "cup_ties_commissioner_insert"
  on public.cup_ties for insert
  to authenticated
  with check (public.is_commissioner());

create policy "cup_ties_commissioner_update"
  on public.cup_ties for update
  to authenticated
  using (public.is_commissioner())
  with check (public.is_commissioner());

create policy "cup_ties_commissioner_delete"
  on public.cup_ties for delete
  to authenticated
  using (public.is_commissioner());

-- ---------------------------------------------------------------------------
-- honours
-- ---------------------------------------------------------------------------

create policy "honours_public_read"
  on public.honours for select
  to anon, authenticated
  using (true);

create policy "honours_commissioner_insert"
  on public.honours for insert
  to authenticated
  with check (public.is_commissioner());

create policy "honours_commissioner_update"
  on public.honours for update
  to authenticated
  using (public.is_commissioner())
  with check (public.is_commissioner());

create policy "honours_commissioner_delete"
  on public.honours for delete
  to authenticated
  using (public.is_commissioner());
