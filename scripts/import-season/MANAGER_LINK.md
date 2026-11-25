# Manager linking (post-auth)

Teams were seeded with `manager_id = null`. After each manager signs up, link:

```sql
-- DURHAM DYNAMO ← BRYN COOMBE
update public.teams set manager_id = (
  select id from public.profiles where display_name = 'BRYN COOMBE'  -- or match by email
) where season_id = (select id from public.seasons where name = '2026/2027')
  and name = 'DURHAM DYNAMO';

-- ROBS ROVERS ← ROB PICKETT
update public.teams set manager_id = (
  select id from public.profiles where display_name = 'ROB PICKETT'  -- or match by email
) where season_id = (select id from public.seasons where name = '2026/2027')
  and name = 'ROBS ROVERS';

-- CF CALA ALCAUFAR ← JOE HARPER
update public.teams set manager_id = (
  select id from public.profiles where display_name = 'JOE HARPER'  -- or match by email
) where season_id = (select id from public.seasons where name = '2026/2027')
  and name = 'CF CALA ALCAUFAR';

-- SHEFSPANYOL ← SEAN HELSBY
update public.teams set manager_id = (
  select id from public.profiles where display_name = 'SEAN HELSBY'  -- or match by email
) where season_id = (select id from public.seasons where name = '2026/2027')
  and name = 'SHEFSPANYOL';

-- SPORTING HOOF ← MIKE ASTLEY
update public.teams set manager_id = (
  select id from public.profiles where display_name = 'MIKE ASTLEY'  -- or match by email
) where season_id = (select id from public.seasons where name = '2026/2027')
  and name = 'SPORTING HOOF';

-- RASH IN THE ATTIC ← MARK WHITTLE
update public.teams set manager_id = (
  select id from public.profiles where display_name = 'MARK WHITTLE'  -- or match by email
) where season_id = (select id from public.seasons where name = '2026/2027')
  and name = 'RASH IN THE ATTIC';

-- ERIMUS ← RICHARD KILPATRICK
update public.teams set manager_id = (
  select id from public.profiles where display_name = 'RICHARD KILPATRICK'  -- or match by email
) where season_id = (select id from public.seasons where name = '2026/2027')
  and name = 'ERIMUS';

-- WEETABIX 2 LONG FC ← ADAM, NATHAN & DYLAN
update public.teams set manager_id = (
  select id from public.profiles where display_name = 'ADAM, NATHAN & DYLAN'  -- or match by email
) where season_id = (select id from public.seasons where name = '2026/2027')
  and name = 'WEETABIX 2 LONG FC';

-- WENGER BOYS ← SEB BATE
update public.teams set manager_id = (
  select id from public.profiles where display_name = 'SEB BATE'  -- or match by email
) where season_id = (select id from public.seasons where name = '2026/2027')
  and name = 'WENGER BOYS';

-- LE HARPRE ← SAM HARPER
update public.teams set manager_id = (
  select id from public.profiles where display_name = 'SAM HARPER'  -- or match by email
) where season_id = (select id from public.seasons where name = '2026/2027')
  and name = 'LE HARPRE';

-- MIDDLESBROTHERS ← TAMIKO & MAX
update public.teams set manager_id = (
  select id from public.profiles where display_name = 'TAMIKO & MAX'  -- or match by email
) where season_id = (select id from public.seasons where name = '2026/2027')
  and name = 'MIDDLESBROTHERS';

-- NEWELL'S OLD TIKI TAKA ← CHRIS MCD, JIMBO & ADG
update public.teams set manager_id = (
  select id from public.profiles where display_name = 'CHRIS MCD, JIMBO & ADG'  -- or match by email
) where season_id = (select id from public.seasons where name = '2026/2027')
  and name = 'NEWELL''S OLD TIKI TAKA';

-- DUGGANS ARMANDILLOS ← JAMIE & MIKE
update public.teams set manager_id = (
  select id from public.profiles where display_name = 'JAMIE & MIKE'  -- or match by email
) where season_id = (select id from public.seasons where name = '2026/2027')
  and name = 'DUGGANS ARMANDILLOS';

-- ATLETICO DEC ← CHARLIE, ELIO & DAVE
update public.teams set manager_id = (
  select id from public.profiles where display_name = 'CHARLIE, ELIO & DAVE'  -- or match by email
) where season_id = (select id from public.seasons where name = '2026/2027')
  and name = 'ATLETICO DEC';

```

Also set `profiles.role = 'manager'` (or commissioner for Bryn).
