# Manager linking (post-auth)

**Rule (PRD §2 + Bryn 2026-11-25):** one login per person; a team may have multiple managers.

Seed inserts `team_managers` rows with `display_name` from the spreadsheet and `profile_id = null`. After each person signs up, link their profile:

```sql
update public.team_managers
set profile_id = (
  select id from public.profiles
  where id = (select id from auth.users where email = 'person@example.com')
)
where display_name = 'DISPLAY NAME FROM BELOW'
  and team_id = (
    select id from public.teams
    where name = 'TEAM NAME'
      and season_id = (select id from public.seasons where name = '2026/2027')
  );

update public.profiles
set role = 'manager'
where id = (select id from auth.users where email = 'person@example.com');
```

## Roster (from spreadsheet; split on `,` / `&`)

| Team | display_name (as seeded) | Notes |
|------|--------------------------|-------|
| DURHAM DYNAMO | BRYN COOMBE | |
| ROBS ROVERS | ROB PICKETT | |
| CF CALA ALCAUFAR | JOE HARPER | |
| SHEFSPANYOL | SEAN HELSBY | |
| SPORTING HOOF | MIKE ASTLEY | |
| RASH IN THE ATTIC | MARK WHITTLE | |
| ERIMUS | RICHARD KILPATRICK | |
| WEETABIX 2 LONG FC | ADAM | First name only in sheet — **confirm full name with Bryn** |
| WEETABIX 2 LONG FC | NATHAN | First name only — **confirm** |
| WEETABIX 2 LONG FC | DYLAN | First name only — **confirm** |
| WENGER BOYS | SEB BATE | |
| LE HARPRE | SAM HARPER | |
| MIDDLESBROTHERS | TAMIKO | First name only — **confirm** |
| MIDDLESBROTHERS | MAX | First name only — **confirm** |
| NEWELL'S OLD TIKI TAKA | CHRIS MCD | |
| NEWELL'S OLD TIKI TAKA | JIMBO | Nickname? — **confirm legal/display name** |
| NEWELL'S OLD TIKI TAKA | ADG | Initials — **confirm** |
| DUGGANS ARMANDILLOS | JAMIE | First name only — **confirm** |
| DUGGANS ARMANDILLOS | MIKE | First name only — **confirm** (distinct from MIKE ASTLEY) |
| ATLETICO DEC | CHARLIE | First name only — **confirm** |
| ATLETICO DEC | ELIO | First name only — **confirm** |
| ATLETICO DEC | DAVE | First name only — **confirm** |

Do **not** invent surnames. Ask Bryn before changing `display_name` values used for matching.
