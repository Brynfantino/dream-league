import { resolveFranchiseId } from "@/lib/league/franchise-map";

/**
 * Owner-created crests under `public/team-badges/{franchiseId}.jpg`.
 * Keys must stay in sync with that folder / `manifest.json`.
 */
export const TEAM_BADGE_FRANCHISE_IDS = [
  "atletico-dec",
  "cf-cala-alcaufar",
  "dreamers-dregs",
  "durham-dynamo",
  "erimus",
  "le-harpre",
  "middlesbrothers",
  "nutmeg-utd",
  "rash-in-the-attic",
  "robs-rovers",
  "shefspanyol",
  "sporting-hoof",
  "tiki-taka",
  "wenger-boys",
] as const;

export type TeamBadgeFranchiseId = (typeof TEAM_BADGE_FRANCHISE_IDS)[number];

const badgeSet = new Set<string>(TEAM_BADGE_FRANCHISE_IDS);

/** Public URL for a franchise crest, or null if none uploaded yet. */
export function teamBadgeUrlForFranchiseId(
  franchiseId: string,
): string | null {
  if (!badgeSet.has(franchiseId)) return null;
  return `/team-badges/${franchiseId}.jpg`;
}

/** Resolve a season team name → crest URL via franchise continuity. */
export function teamBadgeUrlForTeamName(teamName: string): string | null {
  return teamBadgeUrlForFranchiseId(resolveFranchiseId(teamName));
}
