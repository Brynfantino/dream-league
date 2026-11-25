# Schema vs spreadsheet / PRD

Game rules: **Dream-League_PRD.md**. Do not invent rules.

Aligned to foundation PRD schema (`goalkeeper_clubs`, `players` DEF/MID/FWD, `team_managers` in core).

## Locked import scope (Bryn 2026-11-25)

| Decision | Seed behaviour |
|----------|----------------|
| Skip I ROBOT | Excluded |
| BFL / Bet Settlement out of scope | Not seeded |
| Cup starts February | No `cup_ties` |
| One login per person; multi-manager teams | `team_managers` only (no `teams.manager_id`) |

## Mapping

| Spreadsheet / PRD | Schema | Import |
|-------------------|--------|--------|
| Season | `seasons` | Seeded |
| 14 teams | `teams` | 14 rows |
| Managers | `team_managers` | 22 display_name rows; profile_id null |
| Outfield DEF/MID/FWD | `players.position` | DEF / MID / FWD (not collapsed) |
| GK club | `goalkeeper_clubs` | Club name asset |
| GK ownership | `goalkeeper_memberships` | Stints incl. sold |
| Outfield ownership | `squad_memberships` | Stints incl. sold |
| Auction cost | none | JSON only |
| Goals | `goal_events` ledger | FOR/AGAINST expanded to N events per stint; totals derived (Bryn confirmed; no season stats tables) |
| Cup / BFL / bets | — | Not imported |

## Ask Bryn

- Full names for first-name-only managers (`MANAGER_LINK.md`)
- Stats column I; Middlesbrothers $1 costs; auth/emails
