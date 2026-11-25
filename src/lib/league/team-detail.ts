import type {
  GoalEvent,
  GoalEventType,
  GoalkeeperClub,
  Player,
  PlayerPosition,
} from "@/types/database";

export type SquadOutfieldMember = {
  player_id: string;
  name: string;
  club: string | null;
  position: PlayerPosition;
};

export type SquadGoalkeeper = {
  goalkeeper_club_id: string;
  name: string;
};

export type PlayerGoalRow = {
  player_id: string;
  name: string;
  position: PlayerPosition;
  goals: number;
};

export type GoalkeeperConcessionRow = {
  goalkeeper_club_id: string;
  name: string;
  concessions: number;
  /** True when this club is the team's current (active) goalkeeper. */
  is_current: boolean;
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

/**
 * Season Player Goals for a team from goal_events (outfield_goal only).
 * Includes any player who scored for this team — not limited to current squad.
 */
export function derivePlayerGoals(
  events: Pick<GoalEvent, "event_type" | "player_id">[],
  playersById: Map<string, Pick<Player, "id" | "name" | "position">>,
): PlayerGoalRow[] {
  const counts = new Map<string, number>();

  for (const event of events) {
    if (event.event_type !== ("outfield_goal" satisfies GoalEventType)) continue;
    if (!event.player_id) continue;
    counts.set(event.player_id, (counts.get(event.player_id) ?? 0) + 1);
  }

  const rows: PlayerGoalRow[] = [];
  for (const [player_id, goals] of counts) {
    const player = playersById.get(player_id);
    if (!player) continue;
    rows.push({
      player_id,
      name: player.name,
      position: player.position,
      goals,
    });
  }

  return rows.sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    const byPos = POSITION_ORDER[a.position] - POSITION_ORDER[b.position];
    if (byPos !== 0) return byPos;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Goalkeeper Concessions for a team from goal_events (gk_conceded only).
 */
export function deriveGoalkeeperConcessions(
  events: Pick<GoalEvent, "event_type" | "goalkeeper_club_id">[],
  clubsById: Map<string, Pick<GoalkeeperClub, "id" | "name">>,
  currentClubId: string | null,
): GoalkeeperConcessionRow[] {
  const counts = new Map<string, number>();

  for (const event of events) {
    if (event.event_type !== ("gk_conceded" satisfies GoalEventType)) continue;
    if (!event.goalkeeper_club_id) continue;
    counts.set(
      event.goalkeeper_club_id,
      (counts.get(event.goalkeeper_club_id) ?? 0) + 1,
    );
  }

  // Ensure the current GK appears even with zero concessions
  if (currentClubId && !counts.has(currentClubId)) {
    counts.set(currentClubId, 0);
  }

  const rows: GoalkeeperConcessionRow[] = [];
  for (const [goalkeeper_club_id, concessions] of counts) {
    const club = clubsById.get(goalkeeper_club_id);
    if (!club) continue;
    rows.push({
      goalkeeper_club_id,
      name: club.name,
      concessions,
      is_current: goalkeeper_club_id === currentClubId,
    });
  }

  return rows.sort((a, b) => {
    if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
    if (b.concessions !== a.concessions) return b.concessions - a.concessions;
    return a.name.localeCompare(b.name);
  });
}
