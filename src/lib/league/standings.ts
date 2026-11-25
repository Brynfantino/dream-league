import type { GoalEvent, GoalEventType, Team, TeamStanding } from "@/types/database";

export type LeagueTableRow = TeamStanding & {
  team_name: string;
  /** Shared when Points and Goals For are equal (PRD §8). */
  position: number;
};

type TeamSeed = Pick<Team, "id" | "name">;
type GoalEventSeed = Pick<GoalEvent, "team_id" | "event_type">;

/**
 * Derive league standings from goal_events only (PRD §7–§8).
 * - outfield_goal → +1 Goals For
 * - gk_conceded → +1 Goals Against
 * - League Points = GF − GA
 * - Order: points desc, then GF desc; remain tied if still equal
 */
export function deriveStandings(
  teams: TeamSeed[],
  events: GoalEventSeed[],
): LeagueTableRow[] {
  const byTeam = new Map<
    string,
    { team_name: string; goals_for: number; goals_against: number }
  >();

  for (const team of teams) {
    byTeam.set(team.id, {
      team_name: team.name,
      goals_for: 0,
      goals_against: 0,
    });
  }

  for (const event of events) {
    const row = byTeam.get(event.team_id);
    if (!row) continue;

    if (event.event_type === ("outfield_goal" satisfies GoalEventType)) {
      row.goals_for += 1;
    } else if (event.event_type === ("gk_conceded" satisfies GoalEventType)) {
      row.goals_against += 1;
    }
  }

  const ranked = [...byTeam.entries()]
    .map(([team_id, stats]) => ({
      team_id,
      team_name: stats.team_name,
      goals_for: stats.goals_for,
      goals_against: stats.goals_against,
      points: stats.goals_for - stats.goals_against,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
      // Still equal → remain tied; name only stabilises row order, not position
      return a.team_name.localeCompare(b.team_name);
    });

  const rows: LeagueTableRow[] = [];
  for (let i = 0; i < ranked.length; i++) {
    const row = ranked[i]!;
    const prev = rows[i - 1];
    const tied =
      prev !== undefined &&
      prev.points === row.points &&
      prev.goals_for === row.goals_for;

    rows.push({
      ...row,
      position: tied ? prev.position : i + 1,
    });
  }

  return rows;
}
