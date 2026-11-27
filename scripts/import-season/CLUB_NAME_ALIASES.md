# Real-life club name aliases

Spreadsheet imports mix abbreviations and typos. App display / Player Profile
career aggregation uses `src/lib/league/club-aliases.ts`.

## Locked merges

| Variants in source | Canonical |
|--------------------|-----------|
| MILTON KEYNES, MK DONS, MILTON KEYNES DONS | **MILTON KEYNES DONS** |
| MANCHESTER UTD, MANCHESTER UNTIED, MANCHESTER UNITED | **MANCHESTER UNITED** |
| SHEFFIELD UTD, SHEFFIELD UNITED | **SHEFFIELD UNITED** |
| NOTTIGNHAM FOREST, NOTTINGHAM FOREST | **NOTTINGHAM FOREST** |
| WEST BROM, WEST BROMWICH, WEST BROMWICH ALBION | **WEST BROMWICH ALBION** |
| WOLVES, WOLVERHAMPTON | **WOLVERHAMPTON** |
| FOREST GREEN, FOREST GREEN ROVERS | **FOREST GREEN ROVERS** |
| NORWICH CITY, NORWICH | **NORWICH** |
| HULL CITY, HULL | **HULL** |
| LEEDS UNITED, LEEDS | **LEEDS** |
| OXFORD UTD, OXFORD | **OXFORD** |
| QUEENS PARK RANGERS, QPR | **QPR** |
| RETIRED…, RETIRED | **RETIRED** |

## Do not merge

| Names | Why |
|-------|-----|
| QUEENS PARK RANGERS / QPR vs **RANGERS** | Different clubs (QPR ≠ Rangers) |
| SHEFFIELD UNITED vs SHEFFIELD WEDNESDAY | Different clubs |
| MANCHESTER CITY vs MANCHESTER UNITED | Different clubs |

Raw DB `players.club` strings are unchanged until a future data cleanup;
UI canonicalizes on read.
