/**
 * Bryn-confirmed franchise continuity for all-time totals (2026-11-27).
 * Team rows are per-season; aliases collapse to one franchise key.
 * Display name is always the franchise’s latest-season team name (not this map).
 */

export type FranchiseDefinition = {
  /** Stable id for aggregation */
  id: string;
  /** Bryn-preferred brand where named; otherwise the longest-running label */
  canonicalName: string;
  /** Historical / alternate team names (exact DB `teams.name` values) */
  aliases: string[];
};

/**
 * Every known historical team name maps to exactly one franchise.
 * Matching is case-insensitive via {@link resolveFranchiseId}.
 */
export const FRANCHISES: FranchiseDefinition[] = [
  {
    id: "durham-dynamo",
    canonicalName: "DURHAM DYNAMO",
    aliases: ["DURHAM DYNAMO"],
  },
  {
    id: "shefspanyol",
    canonicalName: "SHEFSPANYOL",
    aliases: ["SHEFSPANYOL"],
  },
  {
    id: "rash-in-the-attic",
    canonicalName: "RASH IN THE ATTIC",
    aliases: ["RASH IN THE ATTIC"],
  },
  {
    id: "erimus",
    canonicalName: "ERIMUS",
    aliases: ["ERIMUS"],
  },
  {
    id: "nutmeg-utd",
    canonicalName: "NUTMEG UTD",
    aliases: ["NUTMEG UTD"],
  },
  {
    id: "sporting-hoof",
    canonicalName: "SPORTING HOOF",
    aliases: ["SPORTING HOOF", "SPORTING HOPE"],
  },
  {
    id: "robs-rovers",
    canonicalName: "ROBS ROVERS",
    aliases: ["ROBS ROVERS", "NATHS ROVERS"],
  },
  {
    id: "tiki-taka",
    canonicalName: "TIKI TAKA FC",
    aliases: ["TIKI TAKA FC", "NEWELL'S OLD TIKI TAKA"],
  },
  {
    id: "le-harpre",
    canonicalName: "LE HARPRE",
    aliases: [
      "HALF-A-HARPER FC",
      "ONE AND A HALF A HARPER FC",
      "LE HARPRE",
    ],
  },
  {
    id: "dreamers-dregs",
    canonicalName: "DUGGANS ARMANDILLOS",
    aliases: [
      "DUGGAN'S DREAMERS",
      "DREAMERS DREGS",
      "DREAMER'S DREGS",
      "DUGGANS ARMANDILLOS",
      "DUGGAN'S ARMANDILLOS",
    ],
  },
  {
    id: "wenger-boys",
    canonicalName: "WENGER BOYS",
    aliases: ["MICHU IN DE GEA BAR", "WENGER BOYS"],
  },
  {
    id: "cf-cala-alcaufar",
    canonicalName: "CF CALA ALCAUFAR",
    aliases: [
      "AMALGA SANTOS",
      "ALPEN FLAGE",
      "ALPENFLAGE",
      "CASEMIGOS",
      "CF CALA ALCAUFAR",
    ],
  },
  {
    id: "atletico-dec",
    canonicalName: "ATLETICO DEC",
    aliases: ["CHARLIE'S ANGELS", "ATLETICO DEC"],
  },
  {
    id: "middlesbrothers",
    canonicalName: "MIDDLESBROTHERS",
    aliases: ["DREAMVILLE", "MIDDLESBROTHERS"],
  },
  // One-season / former sides — own all-time rows
  {
    id: "los-borrachos",
    canonicalName: "LOS BORRACHOS",
    aliases: ["LOS BORRACHOS"],
  },
  {
    id: "show-me-the-mane",
    canonicalName: "SHOW ME THE MANE",
    aliases: ["SHOW ME THE MANE"],
  },
  {
    id: "fc-wales",
    canonicalName: "FC WALES",
    aliases: ["FC WALES"],
  },
  {
    id: "yorkshire-pirlo",
    canonicalName: "YORKSHIRE PIRLO",
    aliases: ["YORKSHIRE PIRLO"],
  },
  {
    id: "mctominator",
    canonicalName: "MCTOMINATOR",
    aliases: ["MCTOMINATOR"],
  },
];

const aliasToFranchiseId = (() => {
  const map = new Map<string, string>();
  for (const franchise of FRANCHISES) {
    for (const alias of franchise.aliases) {
      map.set(normalizeTeamName(alias), franchise.id);
    }
  }
  return map;
})();

export function normalizeTeamName(name: string): string {
  return name.trim().toUpperCase();
}

/**
 * Resolve a season team name to a franchise id.
 * Unknown names become their own franchise keyed by normalized name
 * (safety net for future seasons / unmapped renames).
 */
export function resolveFranchiseId(teamName: string): string {
  const key = normalizeTeamName(teamName);
  return aliasToFranchiseId.get(key) ?? `unmapped:${key}`;
}
