# Import current season (2026/27)

**Rules:** Project `docs/Dream-League_PRD.md`. Do not invent game rules.

**Historical 2025/26:** see [`README-2025-26.md`](./README-2025-26.md) (inactive season, Cup + BFL + honours).  
**Historical 2020/21–2024/25:** see [`README-historical-seasons.md`](./README-historical-seasons.md).

Mapping: `/cursor/stores/bc-ef8a0793-1e6f-4d35-b50c-443ca7b526d2/docs/spreadsheet-mapping.md`

## Locked scope (Bryn)

- Skip **I ROBOT**
- No BFL Challenge / Bet Settlement
- Empty cup (starts February)
- One login per person → `team_managers`

## What gets loaded (PRD schema)

| Entity | Count |
|--------|------:|
| Season | 1 |
| Teams | 14 |
| team_managers | 22 |
| players (DEF/MID/FWD) | 184 |
| goalkeeper_clubs | 21 |
| squad_memberships | 190 |
| goalkeeper_memberships | 22 |
| goal_events | ~761 (FOR/AGAINST expanded; derive totals) |
| cup / BFL / bets | skipped |

## How to run

1. Apply foundation migrations from PR #1 (core includes `team_managers` + GK tables).
2. Secrets: URL + `SUPABASE_SERVICE_ROLE_KEY` (never chat).
3. SQL Editor → `seed_2026_27.sql` **or** `npx tsx scripts/import-season/import_season.ts --apply` (expands FOR/AGAINST into `goal_events` by default; `--skip-goal-events` to omit).
4. Link managers after signup (`MANAGER_LINK.md`). Confirm full names where flagged.
5. League totals = derive from `goal_events` (PRD §7); sheet had no match dates — events use ownership start / season start.
