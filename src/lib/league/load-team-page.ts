import { connection } from "next/server";

import { deriveStandings } from "@/lib/league/standings";
import {
  countGoalkeeperConcessions,
  countOutfieldGoalsByPlayer,
  sortOutfieldSquad,
  type SquadGoalkeeper,
  type SquadOutfieldMember,
} from "@/lib/league/team-detail";
import { createClient } from "@/lib/supabase/server";
import type {
  GoalEvent,
  GoalkeeperClub,
  Player,
  PlayerPosition,
  Season,
  Team,
  TeamManager,
} from "@/types/database";

export type TeamListItem = Pick<Team, "id" | "name">;

export type TeamPageDetail = {
  season: Pick<Season, "id" | "name">;
  team: Pick<Team, "id" | "name">;
  managers: string[];
  league_position: number;
  league_points: number;
  goals_for: number;
  goals_against: number;
  current_squad: {
    goalkeeper: SquadGoalkeeper | null;
    outfield: SquadOutfieldMember[];
  };
};

export type TeamPageResult =
  | { status: "unconfigured" }
  | { status: "no_active_season" }
  | { status: "error"; message: string }
  | {
      status: "ok";
      season: Pick<Season, "id" | "name">;
      teams: TeamListItem[];
      detail: TeamPageDetail | null;
      missing_team: boolean;
    };

/**
 * Load Team Page data for the active season (read-only).
 * When teamId is set, include that team's detail; otherwise list only.
 *
 * Current Squad shows active ownership only. Per-member Contribution is
 * +outfield goals / −gk concessions from this team's goal_events for those
 * current assets. Summary GF / GA / Points (and the squad table League Points
 * total) use all season events via deriveStandings — same SoT as League Table.
 */
export async function loadTeamPage(
  teamId: string | null,
): Promise<TeamPageResult> {
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

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name")
    .eq("season_id", activeSeason.id)
    .order("name");

  if (teamsError) {
    return { status: "error", message: teamsError.message };
  }

  const teamList = (teams ?? []) as TeamListItem[];

  if (!teamId) {
    return {
      status: "ok",
      season: activeSeason,
      teams: teamList,
      detail: null,
      missing_team: false,
    };
  }

  const selected = teamList.find((t) => t.id === teamId);
  if (!selected) {
    return {
      status: "ok",
      season: activeSeason,
      teams: teamList,
      detail: null,
      missing_team: true,
    };
  }

  const [managersRes, eventsRes, squadRes, gkRes] = await Promise.all([
    supabase
      .from("team_managers")
      .select("display_name")
      .eq("team_id", selected.id)
      .order("display_name"),
    supabase
      .from("goal_events")
      .select("team_id, event_type, player_id, goalkeeper_club_id")
      .eq("season_id", activeSeason.id),
    supabase
      .from("squad_memberships")
      .select("player_id, players(id, name, club, position)")
      .eq("season_id", activeSeason.id)
      .eq("team_id", selected.id)
      .is("released_at", null),
    supabase
      .from("goalkeeper_memberships")
      .select("goalkeeper_club_id, goalkeeper_clubs(id, name)")
      .eq("season_id", activeSeason.id)
      .eq("team_id", selected.id)
      .is("released_at", null)
      .maybeSingle(),
  ]);

  if (managersRes.error) {
    return { status: "error", message: managersRes.error.message };
  }
  if (eventsRes.error) {
    return { status: "error", message: eventsRes.error.message };
  }
  if (squadRes.error) {
    return { status: "error", message: squadRes.error.message };
  }
  if (gkRes.error) {
    return { status: "error", message: gkRes.error.message };
  }

  const allEvents = (eventsRes.data ?? []) as Pick<
    GoalEvent,
    "team_id" | "event_type" | "player_id" | "goalkeeper_club_id"
  >[];

  const standings = deriveStandings(teamList, allEvents);
  const standing = standings.find((row) => row.team_id === selected.id);

  const managers = (
    (managersRes.data ?? []) as Pick<TeamManager, "display_name">[]
  ).map((m) => m.display_name);

  const teamEvents = allEvents.filter((e) => e.team_id === selected.id);
  const goalsByPlayer = countOutfieldGoalsByPlayer(teamEvents);

  type SquadJoinRow = {
    player_id: string;
    players:
      | Pick<Player, "id" | "name" | "club" | "position">
      | Pick<Player, "id" | "name" | "club" | "position">[]
      | null;
  };

  const outfield: SquadOutfieldMember[] = [];
  for (const row of (squadRes.data ?? []) as SquadJoinRow[]) {
    const player = Array.isArray(row.players) ? row.players[0] : row.players;
    if (!player) continue;
    outfield.push({
      player_id: player.id,
      name: player.name,
      club: player.club,
      position: player.position as PlayerPosition,
      goals: goalsByPlayer.get(player.id) ?? 0,
    });
  }

  type GkJoinRow = {
    goalkeeper_club_id: string;
    goalkeeper_clubs:
      | Pick<GoalkeeperClub, "id" | "name">
      | Pick<GoalkeeperClub, "id" | "name">[]
      | null;
  };

  const gkRow = gkRes.data as GkJoinRow | null;
  let goalkeeper: SquadGoalkeeper | null = null;
  if (gkRow) {
    const club = Array.isArray(gkRow.goalkeeper_clubs)
      ? gkRow.goalkeeper_clubs[0]
      : gkRow.goalkeeper_clubs;
    if (club) {
      goalkeeper = {
        goalkeeper_club_id: club.id,
        name: club.name,
        concessions: countGoalkeeperConcessions(teamEvents, club.id),
      };
    }
  }

  const detail: TeamPageDetail = {
    season: activeSeason,
    team: selected,
    managers,
    league_position: standing?.position ?? teamList.length,
    league_points: standing?.points ?? 0,
    goals_for: standing?.goals_for ?? 0,
    goals_against: standing?.goals_against ?? 0,
    current_squad: {
      goalkeeper,
      outfield: sortOutfieldSquad(outfield),
    },
  };

  return {
    status: "ok",
    season: activeSeason,
    teams: teamList,
    detail,
    missing_team: false,
  };
}
