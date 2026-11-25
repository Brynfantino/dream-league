import { connection } from "next/server";

import type { PlayerDirectoryRow } from "@/lib/league/player-directory";
import { createClient } from "@/lib/supabase/server";
import type {
  GoalEvent,
  Player,
  PlayerPosition,
  Season,
  Team,
} from "@/types/database";

export type PlayerDirectoryTeamOption = Pick<Team, "id" | "name">;

export type PlayerDirectoryResult =
  | { status: "unconfigured" }
  | { status: "no_active_season" }
  | { status: "error"; message: string }
  | {
      status: "ok";
      season: Pick<Season, "id" | "name">;
      rows: PlayerDirectoryRow[];
      teams: PlayerDirectoryTeamOption[];
      clubs: string[];
    };

type MembershipJoin = {
  player_id: string;
  acquired_at: string;
  players:
    | Pick<Player, "id" | "name" | "club" | "position">
    | Pick<Player, "id" | "name" | "club" | "position">[]
    | null;
  teams:
    | Pick<Team, "id" | "name">
    | Pick<Team, "id" | "name">[]
    | null;
};

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Load Player Directory for the active season (read-only).
 * Rows = current outfield ownership; Goals = outfield_goal counts from goal_events.
 */
export async function loadPlayerDirectory(): Promise<PlayerDirectoryResult> {
  await connection();

  const supabase = await createClient();
  if (!supabase) {
    return { status: "unconfigured" };
  }

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .maybeSingle();

  if (seasonError) {
    return { status: "error", message: seasonError.message };
  }
  if (!season) {
    return { status: "no_active_season" };
  }

  const activeSeason = season as Pick<Season, "id" | "name">;

  const [membershipsRes, eventsRes, teamsRes] = await Promise.all([
    supabase
      .from("squad_memberships")
      .select(
        "player_id, acquired_at, players(id, name, club, position), teams(id, name)",
      )
      .eq("season_id", activeSeason.id)
      .is("released_at", null),
    supabase
      .from("goal_events")
      .select("player_id, event_type")
      .eq("season_id", activeSeason.id)
      .eq("event_type", "outfield_goal"),
    supabase
      .from("teams")
      .select("id, name")
      .eq("season_id", activeSeason.id)
      .order("name"),
  ]);

  if (membershipsRes.error) {
    return { status: "error", message: membershipsRes.error.message };
  }
  if (eventsRes.error) {
    return { status: "error", message: eventsRes.error.message };
  }
  if (teamsRes.error) {
    return { status: "error", message: teamsRes.error.message };
  }

  const goalCounts = new Map<string, number>();
  for (const event of (eventsRes.data ?? []) as Pick<
    GoalEvent,
    "player_id" | "event_type"
  >[]) {
    if (!event.player_id) continue;
    goalCounts.set(event.player_id, (goalCounts.get(event.player_id) ?? 0) + 1);
  }

  const rows: PlayerDirectoryRow[] = [];
  const clubSet = new Set<string>();

  for (const row of (membershipsRes.data ?? []) as MembershipJoin[]) {
    const player = unwrapOne(row.players);
    const team = unwrapOne(row.teams);
    if (!player) continue;

    if (player.club) clubSet.add(player.club);

    rows.push({
      player_id: player.id,
      name: player.name,
      position: player.position as PlayerPosition,
      club: player.club,
      team_id: team?.id ?? null,
      team_name: team?.name ?? null,
      acquired_at: row.acquired_at,
      goals: goalCounts.get(player.id) ?? 0,
    });
  }

  const teams = (teamsRes.data ?? []) as PlayerDirectoryTeamOption[];
  const clubs = [...clubSet].sort((a, b) => a.localeCompare(b));

  return {
    status: "ok",
    season: activeSeason,
    rows,
    teams,
    clubs,
  };
}
