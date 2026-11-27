import { connection } from "next/server";

import { canonicalizeClubName } from "@/lib/league/club-aliases";
import {
  linkTeamIdForName,
  mapActiveTeamIdsByFranchise,
} from "@/lib/league/team-links";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import type {
  GoalEvent,
  Honour,
  Player,
  PlayerPosition,
  Season,
  Team,
} from "@/types/database";

export type PlayerClubCareerRow = {
  /** Representative players.id (first seen) for this canonical club. */
  player_id: string;
  club: string | null;
  positions: PlayerPosition[];
  dream_league_goals: number;
  seasons: string[];
  ownership_stints: number;
};

export type PlayerOwnershipRow = {
  id: string;
  player_id: string;
  season_id: string;
  season_name: string;
  season_starts_on: string;
  season_ends_on: string | null;
  team_id: string;
  team_name: string;
  /** Active-season team id for Team Page links when franchise still exists. */
  link_team_id: string | null;
  club: string | null;
  position: PlayerPosition;
  acquired_at: string;
  /** Raw membership release; null if still open in source data. */
  released_at: string | null;
  /**
   * Display end of ownership window.
   * Historical open stints use season ends_on (typically 31 May);
   * active-season open stints stay null → "present".
   */
  owned_until: string | null;
  goals_while_owned: number;
  is_current: boolean;
};

export type PlayerPageDetail = {
  /** Entry-point players.id from the URL. */
  entry_player_id: string;
  name: string;
  /**
   * Reserved for a future headshot (external API or uploaded asset).
   * Always null today — UI shows initials placeholder.
   */
  photo_url: string | null;
  positions: PlayerPosition[];
  /** Best-known current real-life club (active ownership preferred). */
  current_club: string | null;
  /** Active-season Dream League owner, if any. */
  current_team_name: string | null;
  current_team_link_id: string | null;
  career_goals: number;
  /** Seasons owned by the League Champions team at any point. */
  league_titles: number;
  /** Seasons owned by the Cup Winners team at any point. */
  cup_titles: number;
  club_career: PlayerClubCareerRow[];
  ownership_history: PlayerOwnershipRow[];
  /**
   * Soft person identity: rows sharing this exact `players.name`.
   * Club/position changes create multiple UUIDs; profile merges them.
   */
  identity_note: string;
};

export type PlayerPageResult =
  | { status: "unconfigured" }
  | { status: "error"; message: string }
  | { status: "not_found" }
  | { status: "ok"; detail: PlayerPageDetail };

type MembershipJoin = {
  id: string;
  season_id: string;
  team_id: string;
  player_id: string;
  acquired_at: string;
  released_at: string | null;
  teams: Pick<Team, "id" | "name"> | Pick<Team, "id" | "name">[] | null;
  seasons:
    | Pick<Season, "id" | "name" | "starts_on" | "ends_on" | "is_active">
    | Pick<Season, "id" | "name" | "starts_on" | "ends_on" | "is_active">[]
    | null;
};

type HonourRow = Pick<Honour, "id" | "season_id" | "team_id" | "title">;

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const POSITION_ORDER: Record<PlayerPosition, number> = {
  DEF: 0,
  MID: 1,
  FWD: 2,
};

function sortPositions(positions: Iterable<PlayerPosition>): PlayerPosition[] {
  return [...new Set(positions)].sort(
    (a, b) => POSITION_ORDER[a] - POSITION_ORDER[b],
  );
}

/**
 * Load Player Profile for an entry `players.id`.
 * Career merges all `players` rows with the same exact name (club moves).
 */
export async function loadPlayerPage(
  playerId: string | null,
): Promise<PlayerPageResult> {
  await connection();

  if (!playerId) {
    return { status: "not_found" };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { status: "unconfigured" };
  }

  const { data: entryRaw, error: entryError } = await supabase
    .from("players")
    .select("id, name, club, position")
    .eq("id", playerId)
    .maybeSingle();

  if (entryError) {
    return { status: "error", message: entryError.message };
  }
  if (!entryRaw) {
    return { status: "not_found" };
  }

  const entry = entryRaw as Pick<Player, "id" | "name" | "club" | "position">;

  const { data: namePeersRaw, error: peersError } = await supabase
    .from("players")
    .select("id, name, club, position")
    .eq("name", entry.name);

  if (peersError) {
    return { status: "error", message: peersError.message };
  }

  const peerPlayers = (namePeersRaw ?? []) as Pick<
    Player,
    "id" | "name" | "club" | "position"
  >[];
  const playerIds = peerPlayers.map((p) => p.id);
  const playerById = new Map(peerPlayers.map((p) => [p.id, p]));

  const { data: activeSeasonRaw, error: activeSeasonError } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (activeSeasonError) {
    return { status: "error", message: activeSeasonError.message };
  }

  const activeSeasonId = (activeSeasonRaw as { id: string } | null)?.id ?? null;

  const [membershipsRes, eventsRes, activeTeamsRes, honoursRes] =
    await Promise.all([
      fetchAllRows<MembershipJoin>((from, to) =>
        supabase
          .from("squad_memberships")
          .select(
            "id, season_id, team_id, player_id, acquired_at, released_at, teams(id, name), seasons(id, name, starts_on, ends_on, is_active)",
          )
          .in("player_id", playerIds)
          .order("acquired_at", { ascending: true })
          .range(from, to),
      ),
      fetchAllRows<
        Pick<GoalEvent, "player_id" | "team_id" | "season_id" | "event_type">
      >((from, to) =>
        supabase
          .from("goal_events")
          .select("player_id, team_id, season_id, event_type")
          .in("player_id", playerIds)
          .eq("event_type", "outfield_goal")
          .range(from, to),
      ),
      activeSeasonId
        ? supabase
            .from("teams")
            .select("id, name")
            .eq("season_id", activeSeasonId)
        : Promise.resolve({
            data: [] as { id: string; name: string }[],
            error: null,
          }),
      supabase.from("honours").select("id, season_id, team_id, title"),
    ]);

  if (activeTeamsRes.error) {
    return { status: "error", message: activeTeamsRes.error.message };
  }

  const activeTeams = (activeTeamsRes.data ?? []) as {
    id: string;
    name: string;
  }[];

  if (membershipsRes.error) {
    return { status: "error", message: membershipsRes.error.message };
  }
  if (eventsRes.error) {
    return { status: "error", message: eventsRes.error.message };
  }
  if (honoursRes.error) {
    return { status: "error", message: honoursRes.error.message };
  }

  const events = eventsRes.data ?? [];
  const goalsByPlayer = new Map<string, number>();
  const goalsByPlayerTeamSeason = new Map<string, number>();
  for (const event of events) {
    if (!event.player_id) continue;
    goalsByPlayer.set(
      event.player_id,
      (goalsByPlayer.get(event.player_id) ?? 0) + 1,
    );
    const key = `${event.player_id}::${event.team_id}::${event.season_id}`;
    goalsByPlayerTeamSeason.set(
      key,
      (goalsByPlayerTeamSeason.get(key) ?? 0) + 1,
    );
  }

  const activeByFranchise = mapActiveTeamIdsByFranchise(activeTeams);

  const ownership_history: PlayerOwnershipRow[] = [];
  for (const row of membershipsRes.data ?? []) {
    const team = unwrapOne(row.teams);
    const season = unwrapOne(row.seasons);
    const player = playerById.get(row.player_id);
    if (!team || !season || !player) continue;

    const goals =
      goalsByPlayerTeamSeason.get(
        `${row.player_id}::${row.team_id}::${row.season_id}`,
      ) ?? 0;

    const isCurrent = Boolean(season.is_active && row.released_at == null);
    let owned_until: string | null = row.released_at;
    if (!row.released_at) {
      // Open stint: active season stays "present"; historical closes at season end.
      owned_until = isCurrent ? null : season.ends_on;
    }

    ownership_history.push({
      id: row.id,
      player_id: row.player_id,
      season_id: season.id,
      season_name: season.name,
      season_starts_on: season.starts_on ?? "",
      season_ends_on: season.ends_on,
      team_id: team.id,
      team_name: team.name,
      link_team_id: linkTeamIdForName(team.name, activeByFranchise),
      club: canonicalizeClubName(player.club),
      position: player.position,
      acquired_at: row.acquired_at,
      released_at: row.released_at,
      owned_until,
      goals_while_owned: goals,
      is_current: isCurrent,
    });
  }

  // Newest ownership first for the history table.
  ownership_history.sort((a, b) => {
    const bySeason = b.season_starts_on.localeCompare(a.season_starts_on);
    if (bySeason !== 0) return bySeason;
    return b.acquired_at.localeCompare(a.acquired_at);
  });

  // Club career: one row per canonical club (merges spelling variants).
  const careerByClub = new Map<
    string,
    {
      player_id: string;
      club: string | null;
      positions: Set<PlayerPosition>;
      dream_league_goals: number;
      seasons: Set<string>;
      ownership_stints: number;
    }
  >();

  for (const player of peerPlayers) {
    const club = canonicalizeClubName(player.club);
    const key = club ?? `unknown:${player.id}`;
    const stints = ownership_history.filter((o) => o.player_id === player.id);
    const existing = careerByClub.get(key);
    if (!existing) {
      careerByClub.set(key, {
        player_id: player.id,
        club,
        positions: new Set([player.position]),
        dream_league_goals: goalsByPlayer.get(player.id) ?? 0,
        seasons: new Set(stints.map((s) => s.season_name)),
        ownership_stints: stints.length,
      });
    } else {
      existing.positions.add(player.position);
      existing.dream_league_goals += goalsByPlayer.get(player.id) ?? 0;
      existing.ownership_stints += stints.length;
      for (const seasonName of stints.map((s) => s.season_name)) {
        existing.seasons.add(seasonName);
      }
    }
  }

  const club_career: PlayerClubCareerRow[] = [...careerByClub.values()].map(
    (row) => ({
      player_id: row.player_id,
      club: row.club,
      positions: sortPositions(row.positions),
      dream_league_goals: row.dream_league_goals,
      seasons: [...row.seasons].sort(),
      ownership_stints: row.ownership_stints,
    }),
  );

  club_career.sort((a, b) => {
    const aFirst = a.seasons[0] ?? "9999";
    const bFirst = b.seasons[0] ?? "9999";
    if (aFirst !== bFirst) return aFirst.localeCompare(bFirst);
    return (a.club ?? "").localeCompare(b.club ?? "");
  });

  const positions = sortPositions(peerPlayers.map((p) => p.position));
  const career_goals = [...goalsByPlayer.values()].reduce((a, b) => a + b, 0);

  const currentOwnership = ownership_history.find((o) => o.is_current);
  let current_club: string | null = currentOwnership?.club ?? null;
  if (!current_club) {
    const latest = ownership_history[0];
    current_club =
      latest?.club ?? canonicalizeClubName(entry.club);
  }

  // Honours: any ownership on the winning team in that season counts.
  const ownedTeamSeasons = new Set(
    ownership_history.map((o) => `${o.season_id}::${o.team_id}`),
  );
  let league_titles = 0;
  let cup_titles = 0;
  for (const honour of (honoursRes.data ?? []) as HonourRow[]) {
    if (!honour.season_id || !honour.team_id) continue;
    if (!ownedTeamSeasons.has(`${honour.season_id}::${honour.team_id}`)) {
      continue;
    }
    const title = honour.title.trim().toLowerCase();
    if (title === "league champions") league_titles += 1;
    else if (title === "cup winners") cup_titles += 1;
  }

  return {
    status: "ok",
    detail: {
      entry_player_id: entry.id,
      name: entry.name,
      photo_url: null,
      positions,
      current_club,
      current_team_name: currentOwnership?.team_name ?? null,
      current_team_link_id: currentOwnership?.link_team_id ?? null,
      career_goals,
      league_titles,
      cup_titles,
      club_career,
      ownership_history,
      identity_note:
        "Career combines every Dream League record sharing this player name. Real-life club moves are separate rows in the club career table. League/Cup titles count seasons where this player was owned by the winning team at any point.",
    },
  };
}
