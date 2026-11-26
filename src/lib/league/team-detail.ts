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
