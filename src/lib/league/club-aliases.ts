/**
 * Canonical real-life club names for display / career aggregation.
 * Spreadsheet imports use mixed abbreviations and occasional typos.
 *
 * Only merge spellings of the **same** club. Do not map QPR ↔ Rangers.
 */

const CLUB_ALIASES: Record<string, string> = {
  // Milton Keynes Dons
  "MILTON KEYNES": "MILTON KEYNES DONS",
  "MK DONS": "MILTON KEYNES DONS",
  "MILTON KEYNES DONS": "MILTON KEYNES DONS",

  // Manchester United
  "MANCHESTER UTD": "MANCHESTER UNITED",
  "MANCHESTER UNTIED": "MANCHESTER UNITED",
  "MANCHESTER UNITED": "MANCHESTER UNITED",

  // Sheffield United
  "SHEFFIELD UTD": "SHEFFIELD UNITED",
  "SHEFFIELD UNITED": "SHEFFIELD UNITED",

  // Nottingham Forest
  "NOTTIGNHAM FOREST": "NOTTINGHAM FOREST",
  "NOTTINGHAM FOREST": "NOTTINGHAM FOREST",

  // West Bromwich Albion
  "WEST BROM": "WEST BROMWICH ALBION",
  "WEST BROMWICH": "WEST BROMWICH ALBION",
  "WEST BROMWICH ALBION": "WEST BROMWICH ALBION",

  // Wolverhampton Wanderers
  WOLVES: "WOLVERHAMPTON",
  WOLVERHAMPTON: "WOLVERHAMPTON",

  // Forest Green Rovers
  "FOREST GREEN": "FOREST GREEN ROVERS",
  "FOREST GREEN ROVERS": "FOREST GREEN ROVERS",

  // Norwich City — short form dominates the dataset
  NORWICH: "NORWICH",
  "NORWICH CITY": "NORWICH",

  // Hull City — short form dominates
  HULL: "HULL",
  "HULL CITY": "HULL",

  // Leeds United — short form dominates
  LEEDS: "LEEDS",
  "LEEDS UNITED": "LEEDS",

  // Oxford United — short form dominates
  OXFORD: "OXFORD",
  "OXFORD UTD": "OXFORD",

  // Queens Park Rangers
  QPR: "QPR",
  "QUEENS PARK RANGERS": "QPR",

  // Non-club marker
  RETIRED: "RETIRED",
  "RETIRED…": "RETIRED",
};

/** Uppercase + collapse whitespace, then apply alias map. */
export function canonicalizeClubName(
  club: string | null | undefined,
): string | null {
  if (club == null) return null;
  const key = club.trim().replace(/\s+/g, " ").toUpperCase();
  if (!key) return null;
  return CLUB_ALIASES[key] ?? key;
}
