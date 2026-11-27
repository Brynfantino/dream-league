# Historical seasons 2019/20 – 2024/25

Inactive seasons seeded for Trophy Cabinet / archive UI.  
**2019/20** is COVID-disrupted (`README-2019-20.md`).  
**2025/26** is separate (`README-2025-26.md`). **2026/27** remains the active season.

## Season defaults

| Season | `starts_on` | `ends_on` | Teams | Status |
|--------|-------------|-----------|------:|--------|
| 2019/2020 | 2019-08-01 | 2020-05-31 | 9 | inactive (COVID) |
| 2020/2021 | 2020-08-01 | 2021-05-31 | 10 | inactive |
| 2021/2022 | 2021-08-01 | 2022-05-31 | 11 | inactive |
| 2022/2023 | 2022-08-01 | 2023-05-31 | 13 | inactive |
| 2023/2024 | 2023-08-01 | 2024-05-31 | 14 | inactive |
| 2024/2025 | 2024-08-01 | 2025-05-31 | 14 | inactive |

All Stats↔Table reconciles are **exact**. I ROBOT / ROBOTICS ANONYMOUS skipped.

## What is seeded per season

- Teams, managers, players/GK clubs, ownership memberships
- `goal_events` expanded from FOR/AGAINST
- Dream League Cup ties + scores (weekend net points)
- Honours: League Champions + Cup Winners  
- No BFL / side bets (not in these workbooks, or out of scope)

## Seed files (run in order after cup_ties migration)

1. `seed_2019_20.sql`
2. `seed_2020_21.sql`
3. `seed_2021_22.sql`
4. `seed_2022_23.sql`
5. `seed_2023_24.sql`
6. `seed_2024_25.sql`

Each seed deletes only its own season name before reload — safe to re-run one season.

## Multi-swap transfers

Same-day multi-player swaps use **spreadsheet adjacency** (same rule Bryn approved for 2025/26). **Bryn approved all** (2026-11-27) for 2020/21–2025/26. Encoded in `APPROVED_OUTFIELD_PAIRINGS` and each `data-XXXX-XX/approved_transfer_pairings.json`.

**2019/20:** no Transfers sheet / no certain dates — pairings empty; membership dates left unknown (`null` in extracts).

## Extracts

`data-2019-20/` … `data-2024-25/` plus `data-historical-summary.json`.
