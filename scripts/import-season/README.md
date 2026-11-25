# Import current season (2026/27)

**Rules source of truth:** Project store `docs/Dream-League_PRD.md`. Do not invent game rules.

Mapping: `/cursor/stores/bc-ef8a0793-1e6f-4d35-b50c-443ca7b526d2/docs/spreadsheet-mapping.md`

## Locked scope (Bryn 2026-11-25)

- Import **14** league teams — **skip I ROBOT**
- **Do not** import BFL Challenge or Bet Settlement
- **Do not** seed cup fixtures (competition starts February; leave empty)
- Managers: **one login per person**; teams may have multiple (`team_managers`)

## What gets loaded

| Entity | Count | Notes |
|--------|------:|-------|
| Season | 1 | `2026/2027`, active |
| Teams | 14 | `manager_id` null |
| team_managers | 22 | display_name from sheet; profile_id null |
| Players | 205 | GK = club; DEF/MID/FWD → `outfield` |
| Squad memberships | 212 | Includes sold/replaced stints |
| Goal events | 0 by default | Optional `--synthetic-goals` only if Bryn confirms |
| Cup / BFL / bets | skipped | |

## How to run

1. Apply migrations in order (including `20261125192000_team_managers.sql`) to `https://ghzcdwxoukxngnstanxv.supabase.co`.
2. Secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (never chat).
3. Preferred: SQL Editor → `seed_2026_27.sql`.
4. Or: `npx tsx scripts/import-season/import_season.ts --dry-run` then `--apply`.
5. After signup, link each person (`MANAGER_LINK.md`). Confirm full names where flagged.

Reference extracts for BFL/bets remain under `data/` but are **not** part of the seed.
