import { connection } from "next/server";

import { canonicalizeClubName } from "@/lib/league/club-aliases";
import { deriveStandings } from "@/lib/league/standings";
import {
  countGoalkeeperConcessions,
  countGoalkeeperConcessionsInStints,
  countOutfieldGoalsByPlayer,
  countOutfieldGoalsInStints,
  sortOutfieldSquad,
  sortTeamHistoryGoalkeepers,
  sortTeamHistoryOutfield,
  type OwnershipStint,
  type SquadGoalkeeper,
  type SquadOutfieldMember,
  type TeamHistoryGoalkeeper,
  type TeamHistoryOutfield,
} from "@/lib/league/team-detail";
import {
  deriveTransferUsage,
  type TransferUsage,
} from "@/lib/league/transfer-usage";
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
  season: Pick<Season, "id" | "name" | "starts_on">;
  team: Pick<Team, "id" | "name">;
  managers: string[];
  league_position: number;
  league_points: number;
  goals_for: number;
  goals_against: number;
  /** PRD §10 allocation usage derived from ownership stints. */
  transfer_usage: TransferUsage;
  current_squad: {
    goalkeeper: SquadGoalkeeper | null;
    outfield: SquadOutfieldMember[];
  };
  /** Released ownership only (active season). Contributions scoped to stint windows. */
  team_history: {
    outfield: TeamHistoryOutfield[];
    goalkeepers: TeamHistoryGoalkeeper[];
  };
};

export type TeamPageResult =
  | { status: "unconfigured" }
  | { status: "no_active_season" }
  | { status: "error"; message: string }
  | {
      status: "ok";
      season: Pick<Season, "id" | "name" | "starts_on">;
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
 *
 * Team History lists released ownership only. Goals / concessions are counted
 * from goal_events whose occurred_on falls inside each released stint's
 * [acquired_at, released_at] window for this team.
 *
 * Transfer usage: each membership with acquired_at after season.starts_on
 * counts as one transfer-in (PRD §10 limits are app constants, not schema).
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
    .select("id, name, starts_on")
    .eq("is_active", true)
    .maybeSingle();

  if (seasonError) {
    return { status: "error", message: seasonError.message };
  }
  if (!season) {
    return { status: "no_active_season" };
  }

  const activeSeason = season as Pick<Season, "id" | "name" | "starts_on">;

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name")
    .eq("season_id", activeSeason.id)
    .order("name");

  if (teamsError) {
    return { status: "error", message: teamsError.message };
  }

  const teamList = (teams ?? []) as TeamListItem[];
  const teamNameById = new Map(teamList.map((t) => [t.id, t.name]));

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

  const [
    managersRes,
    eventsRes,
    squadRes,
    gkRes,
    historySquadRes,
    historyGkRes,
    activeSquadOwnersRes,
    activeGkOwnersRes,
    allSquadStintsRes,
    allGkStintsRes,
  ] = await Promise.all([
    supabase
      .from("team_managers")
      .select("display_name")
      .eq("team_id", selected.id)
      .order("display_name"),
    supabase
      .from("goal_events")
      .select(
        "team_id, event_type, player_id, goalkeeper_club_id, occurred_on",
      )
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
    supabase
      .from("squad_memberships")
      .select(
        "player_id, acquired_at, released_at, players(id, name, club, position)",
      )
      .eq("season_id", activeSeason.id)
      .eq("team_id", selected.id)
      .not("released_at", "is", null),
    supabase
      .from("goalkeeper_memberships")
      .select(
        "goalkeeper_club_id, acquired_at, released_at, goalkeeper_clubs(id, name)",
      )
      .eq("season_id", activeSeason.id)
      .eq("team_id", selected.id)
      .not("released_at", "is", null),
    supabase
      .from("squad_memberships")
      .select("player_id, team_id")
      .eq("season_id", activeSeason.id)
      .is("released_at", null),
    supabase
      .from("goalkeeper_memberships")
      .select("goalkeeper_club_id, team_id")
      .eq("season_id", activeSeason.id)
      .is("released_at", null),
    supabase
      .from("squad_memberships")
      .select("acquired_at, released_at")
      .eq("season_id", activeSeason.id)
      .eq("team_id", selected.id),
    supabase
      .from("goalkeeper_memberships")
      .select("acquired_at, released_at")
      .eq("season_id", activeSeason.id)
      .eq("team_id", selected.id),
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
  if (historySquadRes.error) {
    return { status: "error", message: historySquadRes.error.message };
  }
  if (historyGkRes.error) {
    return { status: "error", message: historyGkRes.error.message };
  }
  if (activeSquadOwnersRes.error) {
    return { status: "error", message: activeSquadOwnersRes.error.message };
  }
  if (activeGkOwnersRes.error) {
    return { status: "error", message: activeGkOwnersRes.error.message };
  }
  if (allSquadStintsRes.error) {
    return { status: "error", message: allSquadStintsRes.error.message };
  }
  if (allGkStintsRes.error) {
    return { status: "error", message: allGkStintsRes.error.message };
  }

  const allEvents = (eventsRes.data ?? []) as Pick<
    GoalEvent,
    "team_id" | "event_type" | "player_id" | "goalkeeper_club_id" | "occurred_on"
  >[];

  const outfieldStints = (allSquadStintsRes.data ?? []) as {
    acquired_at: string;
    released_at: string | null;
  }[];
  const gkStints = (allGkStintsRes.data ?? []) as {
    acquired_at: string;
    released_at: string | null;
  }[];
  const transfer_usage = deriveTransferUsage(
    outfieldStints.map((s) => s.acquired_at),
    gkStints.map((s) => s.acquired_at),
    activeSeason.starts_on,
  );

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

  type HistorySquadJoinRow = SquadJoinRow & {
    acquired_at: string;
    released_at: string;
  };

  type GkJoinRow = {
    goalkeeper_club_id: string;
    goalkeeper_clubs:
      | Pick<GoalkeeperClub, "id" | "name">
      | Pick<GoalkeeperClub, "id" | "name">[]
      | null;
  };

  type HistoryGkJoinRow = GkJoinRow & {
    acquired_at: string;
    released_at: string;
  };

  const outfield: SquadOutfieldMember[] = [];
  const currentPlayerIds = new Set<string>();
  for (const row of (squadRes.data ?? []) as SquadJoinRow[]) {
    const player = Array.isArray(row.players) ? row.players[0] : row.players;
    if (!player) continue;
    currentPlayerIds.add(player.id);
    outfield.push({
      player_id: player.id,
      name: player.name,
      club: canonicalizeClubName(player.club),
      position: player.position as PlayerPosition,
      goals: goalsByPlayer.get(player.id) ?? 0,
    });
  }

  const gkRow = gkRes.data as GkJoinRow | null;
  let goalkeeper: SquadGoalkeeper | null = null;
  let currentGkClubId: string | null = null;
  if (gkRow) {
    const club = Array.isArray(gkRow.goalkeeper_clubs)
      ? gkRow.goalkeeper_clubs[0]
      : gkRow.goalkeeper_clubs;
    if (club) {
      currentGkClubId = club.id;
      goalkeeper = {
        goalkeeper_club_id: club.id,
        name: canonicalizeClubName(club.name) ?? club.name,
        concessions: countGoalkeeperConcessions(teamEvents, club.id),
      };
    }
  }

  const currentOwnerByPlayer = new Map<string, string>();
  for (const row of (activeSquadOwnersRes.data ?? []) as {
    player_id: string;
    team_id: string;
  }[]) {
    const name = teamNameById.get(row.team_id);
    if (name) currentOwnerByPlayer.set(row.player_id, name);
  }

  const currentOwnerByGk = new Map<string, string>();
  for (const row of (activeGkOwnersRes.data ?? []) as {
    goalkeeper_club_id: string;
    team_id: string;
  }[]) {
    const name = teamNameById.get(row.team_id);
    if (name) currentOwnerByGk.set(row.goalkeeper_club_id, name);
  }

  const historyStintsByPlayer = new Map<
    string,
    {
      player: Pick<Player, "id" | "name" | "club" | "position">;
      stints: OwnershipStint[];
    }
  >();

  for (const row of (historySquadRes.data ?? []) as HistorySquadJoinRow[]) {
    const player = Array.isArray(row.players) ? row.players[0] : row.players;
    if (!player) continue;
    if (currentPlayerIds.has(player.id)) continue;
    const existing = historyStintsByPlayer.get(player.id);
    const stint: OwnershipStint = {
      acquired_at: row.acquired_at,
      released_at: row.released_at,
    };
    if (existing) {
      existing.stints.push(stint);
    } else {
      historyStintsByPlayer.set(player.id, { player, stints: [stint] });
    }
  }

  const historyOutfield: TeamHistoryOutfield[] = [];
  for (const { player, stints } of historyStintsByPlayer.values()) {
    historyOutfield.push({
      player_id: player.id,
      name: player.name,
      club: canonicalizeClubName(player.club),
      position: player.position as PlayerPosition,
      goals: countOutfieldGoalsInStints(
        allEvents,
        selected.id,
        player.id,
        stints,
      ),
      current_owner: currentOwnerByPlayer.get(player.id) ?? null,
    });
  }

  const historyStintsByGk = new Map<
    string,
    {
      club: Pick<GoalkeeperClub, "id" | "name">;
      stints: OwnershipStint[];
    }
  >();

  for (const row of (historyGkRes.data ?? []) as HistoryGkJoinRow[]) {
    const club = Array.isArray(row.goalkeeper_clubs)
      ? row.goalkeeper_clubs[0]
      : row.goalkeeper_clubs;
    if (!club) continue;
    if (currentGkClubId === club.id) continue;
    const existing = historyStintsByGk.get(club.id);
    const stint: OwnershipStint = {
      acquired_at: row.acquired_at,
      released_at: row.released_at,
    };
    if (existing) {
      existing.stints.push(stint);
    } else {
      historyStintsByGk.set(club.id, { club, stints: [stint] });
    }
  }

  const historyGoalkeepers: TeamHistoryGoalkeeper[] = [];
  for (const { club, stints } of historyStintsByGk.values()) {
    historyGoalkeepers.push({
      goalkeeper_club_id: club.id,
      name: canonicalizeClubName(club.name) ?? club.name,
      concessions: countGoalkeeperConcessionsInStints(
        allEvents,
        selected.id,
        club.id,
        stints,
      ),
      current_owner: currentOwnerByGk.get(club.id) ?? null,
    });
  }

  const detail: TeamPageDetail = {
    season: activeSeason,
    team: selected,
    managers,
    league_position: standing?.position ?? teamList.length,
    league_points: standing?.points ?? 0,
    goals_for: standing?.goals_for ?? 0,
    goals_against: standing?.goals_against ?? 0,
    transfer_usage,
    current_squad: {
      goalkeeper,
      outfield: sortOutfieldSquad(outfield),
    },
    team_history: {
      outfield: sortTeamHistoryOutfield(historyOutfield),
      goalkeepers: sortTeamHistoryGoalkeepers(historyGoalkeepers),
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
