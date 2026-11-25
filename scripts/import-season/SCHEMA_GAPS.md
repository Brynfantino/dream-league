# Schema gaps vs spreadsheet

Aligned to foundation migration `20261125190000_core_schema.sql`.

| Spreadsheet concept | Schema support | Import behaviour |
|---------------------|----------------|------------------|
| Season 2026/27 | `seasons` | Seeded active |
| Team + manager name | `teams.manager_id` → `profiles` (auth required) | `manager_id` null; see MANAGER_LINK.md |
| DEF/MID/FWD | `player_position` only `goalkeeper`/`outfield` | Mapped to outfield |
| Auction cost | none | Dropped (kept in JSON extracts) |
| Acquisition type (auction/transfer) | none on membership | Inferred only via dates in extracts |
| Cumulative GF/GA per player | none on membership | Optional synthetic `goal_events` via `--synthetic-goals` |
| Discrete match goals | `goal_events` | Not reconstructible from sheet |
| Historical transfers | membership `released_at` | Dates applied; `transfers` table is for proposals only |
| DL Cup empty bracket | `cup_ties` | Not seeded (no teams); skeleton in JSON |
| BFL Challenge / bets | none | Out of scope extracts only |

Standing checksum: sum membership cumulatives == `data/table_snapshot.json` (verified at extract time).
