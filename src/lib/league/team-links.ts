import { resolveFranchiseId } from "@/lib/league/franchise-map";

/** Team Page deep link (active-season team id). */
export function teamPageHref(teamId: string): string {
  return `/team-page?team=${encodeURIComponent(teamId)}`;
}

/**
 * Map franchise id → active-season team row id.
 * Historical / archive surfaces use this so links open the current franchise
 * on Team Page rather than a dead historical team UUID.
 */
export function mapActiveTeamIdsByFranchise(
  activeTeams: { id: string; name: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const team of activeTeams) {
    map.set(resolveFranchiseId(team.name), team.id);
  }
  return map;
}

export function linkTeamIdForName(
  teamName: string,
  activeByFranchise: Map<string, string>,
): string | null {
  return activeByFranchise.get(resolveFranchiseId(teamName)) ?? null;
}
