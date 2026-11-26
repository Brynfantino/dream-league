import type {
  GoalEvent,
  GoalEventType,
  PlayerPosition,
} from "@/types/database";

export type SquadOutfieldMember = {
  player_id: string;
  name: string;
  club: string | null;
  position: PlayerPosition;
  /** outfield_goal events for this team in the active season */
  goals: number;
};

export type SquadGoalkeeper = {
  goalkeeper_club_id: string;
  name: string;
  /** gk_conceded events for this club while owned by this team */
  concessions: number;
};

const POSITION_ORDER: Record<PlayerPosition, number> = {
  DEF: 0,
  MID: 1,
  FWD: 2,
};

export function sortOutfieldSquad(
  members: SquadOutfieldMember[],
): SquadOutfieldMember[] {
  return [...members].sort((a, b) => {
    const byPos = POSITION_ORDER[a.position] - POSITION_ORDER[b.position];
    if (byPos !== 0) return byPos;
    return a.name.localeCompare(b.name);
  });
}

/** Count outfield_goal events per player_id (team events already filtered). */
export function countOutfieldGoalsByPlayer(
  events: Pick<GoalEvent, "event_type" | "player_id">[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.event_type !== ("outfield_goal" satisfies GoalEventType)) continue;
    if (!event.player_id) continue;
    counts.set(event.player_id, (counts.get(event.player_id) ?? 0) + 1);
  }
  return counts;
}

/** Count gk_conceded events for one goalkeeper club (team events already filtered). */
export function countGoalkeeperConcessions(
  events: Pick<GoalEvent, "event_type" | "goalkeeper_club_id">[],
  goalkeeperClubId: string,
): number {
  let total = 0;
  for (const event of events) {
    if (event.event_type !== ("gk_conceded" satisfies GoalEventType)) continue;
    if (event.goalkeeper_club_id === goalkeeperClubId) total += 1;
  }
  return total;
}

/**
 * Squad contribution for display (PRD §7): outfield goals add, concessions subtract.
 * League Points / table total remain GF − GA from deriveStandings — do not sum these
 * row values when ownership has changed mid-season.
 */
export function outfieldContribution(goals: number): number {
  return goals;
}

export function goalkeeperContribution(concessions: number): number {
  return -concessions;
}

/** Format a signed contribution for the squad table (+5, −17, 0). */
export function formatContribution(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return "0";
}

export type TeamHistoryOutfield = {
  player_id: string;
  name: string;
  club: string | null;
  position: PlayerPosition;
  /** outfield_goal events for this team during released ownership stint(s) */
  goals: number;
  /** Active owner team name, if any */
  current_owner: string | null;
};

export type TeamHistoryGoalkeeper = {
  goalkeeper_club_id: string;
  name: string;
  /** gk_conceded events for this team during released ownership stint(s) */
  concessions: number;
  /** Active owner team name, if any */
  current_owner: string | null;
};

/** Compare goal_events.occurred_on (date) to membership acquired_at / released_at. */
export function eventInOwnershipWindow(
  occurredOn: string,
  acquiredAt: string,
  releasedAt: string | null,
): boolean {
  const on = occurredOn.slice(0, 10);
  const start = acquiredAt.slice(0, 10);
  if (on < start) return false;
  if (releasedAt === null) return true;
  return on <= releasedAt.slice(0, 10);
}

export type OwnershipStint = {
  acquired_at: string;
  released_at: string | null;
};

/**
 * Count outfield_goal events for a player on a team within any of the given
 * ownership stints (occurred_on in [acquired, released]).
 */
export function countOutfieldGoalsInStints(
  events: Pick<
    GoalEvent,
    "event_type" | "team_id" | "player_id" | "occurred_on"
  >[],
  teamId: string,
  playerId: string,
  stints: OwnershipStint[],
): number {
  let total = 0;
  for (const event of events) {
    if (event.event_type !== ("outfield_goal" satisfies GoalEventType)) continue;
    if (event.team_id !== teamId || event.player_id !== playerId) continue;
    const inWindow = stints.some((stint) =>
      eventInOwnershipWindow(
        event.occurred_on,
        stint.acquired_at,
        stint.released_at,
      ),
    );
    if (inWindow) total += 1;
  }
  return total;
}

/**
 * Count gk_conceded events for a club on a team within any of the given
 * ownership stints.
 */
export function countGoalkeeperConcessionsInStints(
  events: Pick<
    GoalEvent,
    "event_type" | "team_id" | "goalkeeper_club_id" | "occurred_on"
  >[],
  teamId: string,
  goalkeeperClubId: string,
  stints: OwnershipStint[],
): number {
  let total = 0;
  for (const event of events) {
    if (event.event_type !== ("gk_conceded" satisfies GoalEventType)) continue;
    if (event.team_id !== teamId) continue;
    if (event.goalkeeper_club_id !== goalkeeperClubId) continue;
    const inWindow = stints.some((stint) =>
      eventInOwnershipWindow(
        event.occurred_on,
        stint.acquired_at,
        stint.released_at,
      ),
    );
    if (inWindow) total += 1;
  }
  return total;
}

export function sortTeamHistoryOutfield(
  members: TeamHistoryOutfield[],
): TeamHistoryOutfield[] {
  return [...members].sort((a, b) => {
    const byPos = POSITION_ORDER[a.position] - POSITION_ORDER[b.position];
    if (byPos !== 0) return byPos;
    return a.name.localeCompare(b.name);
  });
}

export function sortTeamHistoryGoalkeepers(
  clubs: TeamHistoryGoalkeeper[],
): TeamHistoryGoalkeeper[] {
  return [...clubs].sort((a, b) => a.name.localeCompare(b.name));
}
