# Schema vs spreadsheet / PRD

Game rules: **Dream-League_PRD.md** (Project store). Do not invent rules.

Aligned to foundation migrations + `20261125192000_team_managers.sql`.

## Locked import scope (Bryn 2026-11-25)

| Decision | Seed behaviour |
|----------|----------------|
| Skip I ROBOT | Excluded from teams / memberships |
| BFL Challenge out of scope | Not seeded (extract kept for reference only) |
| Bet Settlement out of scope | Not seeded |
| Cup starts February; no current data | No `cup_ties` rows |
| One login per person; multi-manager teams | `team_managers` rows per person; `teams.manager_id` left null |

## Mapping

| Spreadsheet / PRD concept | Schema | Import behaviour |
|---------------------------|--------|------------------|
| Season 2026/27 | `seasons` | Seeded active |
| 14 teams (PRD §2) | `teams` | 14 rows; I ROBOT skipped |
| One or more managers per team (PRD §2) | `team_managers` | Split sheet names on `,` / `&`; `profile_id` null until signup |
| Squad 1+2+3+5 (PRD §3) | `squad_memberships` | Active squads are 11; history includes sold |
| GK = club (PRD §4) | `players.position = goalkeeper` | Club identity; no personal GK name in sheet |
| Outfield DEF/MID/FWD (PRD §5) | `outfield` only in enum | Finer position lost in DB (still in JSON extract) |
| Auction cost / $100 budget (PRD §9) | none on membership | Costs kept in JSON only; not seeded |
| Transfers history | membership dates | Proposal table `transfers` unused for history |
| League GF/GA/points (PRD §7–8) | derived from `goal_events` | Default: no events (cumulatives only in sheet). Optional `--synthetic-goals` is **not** PRD — ask Bryn |
| Cup (PRD §11) | `cup_ties` | Empty until February fixtures |
| Honours | `honours` | Not in this workbook |

## Ask Bryn (do not assume)

- Full names for first-name-only / nickname / initials managers (see MANAGER_LINK.md)
- Whether to run `--synthetic-goals` or leave table empty until commissioner goal entry
- Stats column I meaning
- Middlesbrothers all-£1 auction costs intentional?
- Auth: magic link vs password; email list for invites
