# Import current season (2026/27)

Extracted from `DreamLeague26-27.xlsx`. Full column mapping lives in the Project store:

`/cursor/stores/bc-ef8a0793-1e6f-4d35-b50c-443ca7b526d2/docs/spreadsheet-mapping.md`

## What gets loaded

| Entity | Count | Notes |
|--------|------:|-------|
| Season | 1 | `2026/2027`, active |
| Teams | 14 | `manager_id` null until auth link |
| Players | 205 | GK = club keeper; DEF/MID/FWD → `outfield` |
| Squad memberships | 212 | Includes sold/replaced stints |
| Goal events | 0 by default | Spreadsheet has cumulatives only |
| Cup / BFL / bets | skipped | See SCHEMA_GAPS.md |

Placeholder team **I ROBOT** is excluded.

## Bryn: how to run

1. Apply foundation migrations (PR #1) to `https://ghzcdwxoukxngnstanxv.supabase.co`.
2. Put keys in `.env.local` / Cursor secrets (never chat):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. **Preferred:** open Supabase SQL Editor and run `seed_2026_27.sql`.
4. **Or:** `npx tsx scripts/import-season/import_season.ts --dry-run` then `--apply`.
5. To make the league table match the spreadsheet immediately (synthetic events):
   `npx tsx scripts/import-season/import_season.ts --apply --synthetic-goals`
6. After managers sign up, link them with `MANAGER_LINK.md` and set roles.

No live import was run from the agent (no service role key in this environment).

## Verify

Recompute GF/GA from memberships (or from `goal_events` if synthetic) and compare to `data/table_snapshot.csv`. Extract-time verification: all 14 teams matched.
