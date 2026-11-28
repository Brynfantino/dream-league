import { connection } from "next/server";

import { resolveFranchiseId } from "@/lib/league/franchise-map";
import type {
  RecordEntry,
  RecordHolder,
  RecordsPageData,
  RecordsSection,
} from "@/lib/league/records-shared";
import { deriveStandings } from "@/lib/league/standings";
import {
  linkTeamIdForName,
  mapActiveTeamIdsByFranchise,
} from "@/lib/league/team-links";
import { isTransferIn } from "@/lib/league/transfer-usage";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { createClient } from "@/lib/supabase/server";
import type {
  GoalEvent,
  GoalkeeperClub,
  Honour,
  Player,
  PlayerPosition,
  Season,
  SquadMembership,
  Team,
} from "@/types/database";

export type { RecordsPageData } from "@/lib/league/records-shared";

export type RecordsResult =
  | { status: "ok"; data: RecordsPageData }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

type SeasonRow = Pick<
  Season,
  "id" | "name" | "starts_on" | "ends_on" | "is_active"
>;
type TeamRow = Pick<Team, "id" | "name" | "season_id">;
type PlayerRow = Pick<Player, "id" | "name" | "club" | "position">;
type EventRow = Pick<
  GoalEvent,
  | "team_id"
  | "season_id"
  | "event_type"
  | "player_id"
  | "goalkeeper_club_id"
>;
type HonourRow = Pick<Honour, "season_id" | "team_id" | "title">;
type MembershipRow = Pick<
  SquadMembership,
  "id" | "season_id" | "team_id" | "player_id" | "acquired_at" | "released_at"
>;
type GkMembershipRow = {
  season_id: string;
  team_id: string;
  goalkeeper_club_id: string;
};
type GkClubRow = Pick<GoalkeeperClub, "id" | "name">;

const LEAGUE_TITLE = "league champions";
const CUP_TITLE = "cup winners";

function unwrapHolders(
  candidates: RecordHolder[],
  preferHigher: boolean,
  options?: { requirePositive?: boolean },
): RecordHolder[] {
  if (candidates.length === 0) return [];
  const best = preferHigher
    ? Math.max(...candidates.map((c) => c.value))
    : Math.min(...candidates.map((c) => c.value));
  if (options?.requirePositive && best <= 0) return [];
  return candidates
    .filter((c) => c.value === best)
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
}

function entry(
  id: string,
  title: string,
  holders: RecordHolder[],
  description?: string,
): RecordEntry | null {
  if (holders.length === 0) return null;
  return description
    ? { id, title, description, holders }
    : { id, title, holders };
}

function longestConsecutive(indices: number[]): number {
  if (indices.length === 0) return 0;
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1]! + 1) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 1;
    }
  }
  return best;
}

/**
 * Dream League Record Book — achievements and extremes only.
 * Omits records that cannot be computed confidently (acquisition cost,
 * BFL-wide history, transfer-date-polluted tenure / trade counts).
 */
export async function loadRecords(): Promise<RecordsResult> {
  await connection();

  const supabase = await createClient();
  if (!supabase) {
    return { status: "unconfigured" };
  }

  const [
    seasonsRes,
    teamsRes,
    playersRes,
    eventsRes,
    honoursRes,
    membershipsRes,
    gkClubsRes,
    gkMembershipsRes,
  ] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name, starts_on, ends_on, is_active")
      .order("starts_on", { ascending: true }),
    fetchAllRows<TeamRow>((from, to) =>
      supabase.from("teams").select("id, name, season_id").range(from, to),
    ),
    fetchAllRows<PlayerRow>((from, to) =>
      supabase
        .from("players")
        .select("id, name, club, position")
        .range(from, to),
    ),
    fetchAllRows<EventRow>((from, to) =>
      supabase
        .from("goal_events")
        .select(
          "team_id, season_id, event_type, player_id, goalkeeper_club_id",
        )
        .range(from, to),
    ),
    supabase
      .from("honours")
      .select("season_id, team_id, title")
      .in("title", ["League Champions", "Cup Winners"]),
    fetchAllRows<MembershipRow>((from, to) =>
      supabase
        .from("squad_memberships")
        .select(
          "id, season_id, team_id, player_id, acquired_at, released_at",
        )
        .range(from, to),
    ),
    fetchAllRows<GkClubRow>((from, to) =>
      supabase.from("goalkeeper_clubs").select("id, name").range(from, to),
    ),
    fetchAllRows<GkMembershipRow>((from, to) =>
      supabase
        .from("goalkeeper_memberships")
        .select("season_id, team_id, goalkeeper_club_id")
        .range(from, to),
    ),
  ]);

  if (seasonsRes.error) {
    return { status: "error", message: seasonsRes.error.message };
  }
  if (teamsRes.error) {
    return { status: "error", message: teamsRes.error.message };
  }
  if (playersRes.error) {
    return { status: "error", message: playersRes.error.message };
  }
  if (eventsRes.error) {
    return { status: "error", message: eventsRes.error.message };
  }
  if (honoursRes.error) {
    return { status: "error", message: honoursRes.error.message };
  }
  if (membershipsRes.error) {
    return { status: "error", message: membershipsRes.error.message };
  }
  if (gkClubsRes.error) {
    return { status: "error", message: gkClubsRes.error.message };
  }
  if (gkMembershipsRes.error) {
    return { status: "error", message: gkMembershipsRes.error.message };
  }

  const seasons = (seasonsRes.data ?? []) as SeasonRow[];
  const teams = teamsRes.data ?? [];
  const players = playersRes.data ?? [];
  const events = eventsRes.data ?? [];
  const honours = (honoursRes.data ?? []) as HonourRow[];
  const memberships = membershipsRes.data ?? [];
  const gkClubs = gkClubsRes.data ?? [];
  const gkMemberships = gkMembershipsRes.data ?? [];

  const seasonsById = new Map(seasons.map((s) => [s.id, s]));
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const playersById = new Map(players.map((p) => [p.id, p]));
  const gkClubsById = new Map(gkClubs.map((c) => [c.id, c]));

  const completedSeasons = seasons.filter((s) => !s.is_active);
  const completedSeasonIds = new Set(completedSeasons.map((s) => s.id));
  const seasonIndex = new Map(seasons.map((s, i) => [s.id, i]));

  const activeSeason = seasons.find((s) => s.is_active) ?? null;
  const activeTeams = activeSeason
    ? teams.filter((t) => t.season_id === activeSeason.id)
    : [];
  const activeByFranchise = mapActiveTeamIdsByFranchise(activeTeams);

  const linkForTeamName = (name: string) =>
    linkTeamIdForName(name, activeByFranchise);

  // Representative player id per exact name (prefer one with a club).
  const playerIdByName = new Map<string, string>();
  for (const player of players) {
    const existing = playerIdByName.get(player.name);
    if (!existing) {
      playerIdByName.set(player.name, player.id);
      continue;
    }
    const existingPlayer = playersById.get(existing);
    if (existingPlayer && !existingPlayer.club && player.club) {
      playerIdByName.set(player.name, player.id);
    }
  }

  // —— Career goals (name-merged) ——
  const careerGoals = new Map<string, number>();
  for (const event of events) {
    if (event.event_type !== "outfield_goal" || !event.player_id) continue;
    const player = playersById.get(event.player_id);
    if (!player) continue;
    careerGoals.set(
      player.name,
      (careerGoals.get(player.name) ?? 0) + 1,
    );
  }

  const careerGoalHolders = unwrapHolders(
    [...careerGoals.entries()].map(([name, value]) => ({
      kind: "player" as const,
      name,
      player_id: playerIdByName.get(name) ?? null,
      link_team_id: null,
      team_name: null,
      season_name: null,
      value_label: value === 1 ? "1 goal" : `${value} goals`,
      value,
    })),
    true,
    { requirePositive: true },
  );

  // —— Player league / cup titles (owned winning team at any point) ——
  const ownedTeamSeasonsByPlayer = new Map<string, Set<string>>();
  for (const m of memberships) {
    const player = playersById.get(m.player_id);
    if (!player) continue;
    const set =
      ownedTeamSeasonsByPlayer.get(player.name) ?? new Set<string>();
    set.add(`${m.season_id}::${m.team_id}`);
    ownedTeamSeasonsByPlayer.set(player.name, set);
  }

  const playerLeagueTitles = new Map<string, number>();
  const playerCupTitles = new Map<string, number>();
  for (const honour of honours) {
    if (!honour.season_id || !honour.team_id) continue;
    const key = `${honour.season_id}::${honour.team_id}`;
    const title = honour.title.trim().toLowerCase();
    for (const [name, owned] of ownedTeamSeasonsByPlayer) {
      if (!owned.has(key)) continue;
      if (title === LEAGUE_TITLE) {
        playerLeagueTitles.set(name, (playerLeagueTitles.get(name) ?? 0) + 1);
      } else if (title === CUP_TITLE) {
        playerCupTitles.set(name, (playerCupTitles.get(name) ?? 0) + 1);
      }
    }
  }

  const toTitleHolders = (map: Map<string, number>, unit: string) =>
    unwrapHolders(
      [...map.entries()].map(([name, value]) => ({
        kind: "player" as const,
        name,
        player_id: playerIdByName.get(name) ?? null,
        link_team_id: null,
        team_name: null,
        season_name: null,
        value_label: value === 1 ? `1 ${unit}` : `${value} ${unit}s`,
        value,
      })),
      true,
      { requirePositive: true },
    );

  const leagueTitleHolders = toTitleHolders(playerLeagueTitles, "title");
  const cupTitleHolders = toTitleHolders(playerCupTitles, "cup");

  const combinedHonours = new Map<string, number>();
  for (const name of new Set([
    ...playerLeagueTitles.keys(),
    ...playerCupTitles.keys(),
  ])) {
    combinedHonours.set(
      name,
      (playerLeagueTitles.get(name) ?? 0) + (playerCupTitles.get(name) ?? 0),
    );
  }
  const combinedHonourHolders = toTitleHolders(combinedHonours, "honour");

  // —— Single-season player scoring (completed seasons) ——
  type SeasonPlayerAgg = {
    name: string;
    season_id: string;
    goals: number;
    position: PlayerPosition;
    team_id: string | null;
    player_id: string;
    /** Goals per player_id::team_id within this name+season merge. */
    by_stint: Map<string, number>;
  };
  const seasonPlayerGoals = new Map<string, SeasonPlayerAgg>();

  for (const event of events) {
    if (event.event_type !== "outfield_goal" || !event.player_id) continue;
    if (!completedSeasonIds.has(event.season_id)) continue;
    const player = playersById.get(event.player_id);
    if (!player) continue;
    const key = `${player.name}::${event.season_id}`;
    const stintKey = `${event.player_id}::${event.team_id}`;
    const existing = seasonPlayerGoals.get(key);
    if (!existing) {
      seasonPlayerGoals.set(key, {
        name: player.name,
        season_id: event.season_id,
        goals: 1,
        position: player.position,
        team_id: event.team_id,
        player_id: player.id,
        by_stint: new Map([[stintKey, 1]]),
      });
    } else {
      existing.goals += 1;
      existing.by_stint.set(
        stintKey,
        (existing.by_stint.get(stintKey) ?? 0) + 1,
      );
    }
  }

  for (const agg of seasonPlayerGoals.values()) {
    let bestStint = "";
    let bestGoals = -1;
    for (const [stint, goals] of agg.by_stint) {
      if (goals > bestGoals) {
        bestGoals = goals;
        bestStint = stint;
      }
    }
    const [playerId, teamId] = bestStint.split("::");
    if (playerId) {
      agg.player_id = playerId;
      const player = playersById.get(playerId);
      if (player) agg.position = player.position;
    }
    if (teamId) agg.team_id = teamId;
  }

  const seasonPlayerList = [...seasonPlayerGoals.values()];

  const seasonPlayerHoldersPositive = (list: SeasonPlayerAgg[]) =>
    unwrapHolders(
      list.map((row) => {
        const season = seasonsById.get(row.season_id);
        const team = row.team_id ? teamsById.get(row.team_id) : null;
        return {
          kind: "player" as const,
          name: row.name,
          player_id: playerIdByName.get(row.name) ?? row.player_id,
          link_team_id: team ? linkForTeamName(team.name) : null,
          team_name: team?.name ?? null,
          season_name: season?.name ?? null,
          value_label: row.goals === 1 ? "1 goal" : `${row.goals} goals`,
          value: row.goals,
        };
      }),
      true,
      { requirePositive: true },
    );

  const bestSeasonHolders = seasonPlayerHoldersPositive(seasonPlayerList);
  const bestDefHolders = seasonPlayerHoldersPositive(
    seasonPlayerList.filter((r) => r.position === "DEF"),
  );
  const bestMidHolders = seasonPlayerHoldersPositive(
    seasonPlayerList.filter((r) => r.position === "MID"),
  );
  const bestFwdHolders = seasonPlayerHoldersPositive(
    seasonPlayerList.filter((r) => r.position === "FWD"),
  );

  // —— Worst conceding goalkeeper club season ——
  const gkSeasonConceded = new Map<
    string,
    { club_id: string; season_id: string; conceded: number; team_id: string | null }
  >();
  for (const event of events) {
    if (event.event_type !== "gk_conceded" || !event.goalkeeper_club_id) {
      continue;
    }
    if (!completedSeasonIds.has(event.season_id)) continue;
    const key = `${event.goalkeeper_club_id}::${event.season_id}`;
    const existing = gkSeasonConceded.get(key);
    if (!existing) {
      gkSeasonConceded.set(key, {
        club_id: event.goalkeeper_club_id,
        season_id: event.season_id,
        conceded: 1,
        team_id: event.team_id,
      });
    } else {
      existing.conceded += 1;
      existing.team_id = event.team_id;
    }
  }

  // Prefer owning Dream League team from memberships when available.
  const gkOwnerByKey = new Map<string, string>();
  for (const m of gkMemberships) {
    gkOwnerByKey.set(`${m.goalkeeper_club_id}::${m.season_id}`, m.team_id);
  }

  const worstGkHolders = unwrapHolders(
    [...gkSeasonConceded.values()].map((row) => {
      const club = gkClubsById.get(row.club_id);
      const season = seasonsById.get(row.season_id);
      const ownerId =
        gkOwnerByKey.get(`${row.club_id}::${row.season_id}`) ?? row.team_id;
      const team = ownerId ? teamsById.get(ownerId) : null;
      return {
        kind: "goalkeeper_club" as const,
        name: club?.name ?? "Unknown club",
        player_id: null,
        link_team_id: team ? linkForTeamName(team.name) : null,
        team_name: team?.name ?? null,
        season_name: season?.name ?? null,
        value_label:
          row.conceded === 1
            ? "1 conceded"
            : `${row.conceded} conceded`,
        value: row.conceded,
      };
    }),
    true,
    { requirePositive: true },
  );

  // —— Best transfer ever (goals after transfer-in; no auction cost) ——
  const goalsByPlayerTeamSeason = new Map<string, number>();
  for (const event of events) {
    if (event.event_type !== "outfield_goal" || !event.player_id) continue;
    const key = `${event.player_id}::${event.team_id}::${event.season_id}`;
    goalsByPlayerTeamSeason.set(
      key,
      (goalsByPlayerTeamSeason.get(key) ?? 0) + 1,
    );
  }

  const transferCandidates: RecordHolder[] = [];
  for (const m of memberships) {
    const season = seasonsById.get(m.season_id);
    if (!season || !completedSeasonIds.has(season.id)) continue;
    if (!isTransferIn(m.acquired_at, season.starts_on)) continue;
    const player = playersById.get(m.player_id);
    const team = teamsById.get(m.team_id);
    if (!player || !team) continue;
    const goals =
      goalsByPlayerTeamSeason.get(
        `${m.player_id}::${m.team_id}::${m.season_id}`,
      ) ?? 0;
    if (goals <= 0) continue;
    transferCandidates.push({
      kind: "player",
      name: player.name,
      player_id: playerIdByName.get(player.name) ?? player.id,
      link_team_id: linkForTeamName(team.name),
      team_name: team.name,
      season_name: season.name,
      value_label: goals === 1 ? "1 goal after transfer" : `${goals} goals after transfer`,
      value: goals,
    });
  }
  const bestTransferHolders = unwrapHolders(transferCandidates, true, {
    requirePositive: true,
  });

  // —— Team season extremes (completed seasons) ——
  type TeamSeasonStat = {
    team_id: string;
    team_name: string;
    season_name: string;
    goals_for: number;
    goals_against: number;
    points: number;
  };
  const teamSeasonStats: TeamSeasonStat[] = [];

  for (const season of completedSeasons) {
    const seasonTeams = teams.filter((t) => t.season_id === season.id);
    if (seasonTeams.length === 0) continue;
    const seasonEvents = events.filter((e) => e.season_id === season.id);
    const standings = deriveStandings(
      seasonTeams.map((t) => ({ id: t.id, name: t.name })),
      seasonEvents,
    );
    for (const row of standings) {
      teamSeasonStats.push({
        team_id: row.team_id,
        team_name: row.team_name,
        season_name: season.name,
        goals_for: row.goals_for,
        goals_against: row.goals_against,
        points: row.points,
      });
    }
  }

  const toTeamSeasonHolders = (
    list: TeamSeasonStat[],
    pick: (row: TeamSeasonStat) => number,
    format: (value: number) => string,
    preferHigher: boolean,
  ) =>
    unwrapHolders(
      list.map((row) => {
        const value = pick(row);
        return {
          kind: "team" as const,
          name: row.team_name,
          player_id: null,
          link_team_id: linkForTeamName(row.team_name),
          team_name: row.team_name,
          season_name: row.season_name,
          value_label: format(value),
          value,
        };
      }),
      preferHigher,
    );

  const highestGf = toTeamSeasonHolders(
    teamSeasonStats,
    (r) => r.goals_for,
    (v) => (v === 1 ? "1 goal" : `${v} goals`),
    true,
  );
  const fewestGf = toTeamSeasonHolders(
    teamSeasonStats,
    (r) => r.goals_for,
    (v) => (v === 1 ? "1 goal" : `${v} goals`),
    false,
  );
  const highestGa = toTeamSeasonHolders(
    teamSeasonStats,
    (r) => r.goals_against,
    (v) => (v === 1 ? "1 conceded" : `${v} conceded`),
    true,
  );
  const fewestGa = toTeamSeasonHolders(
    teamSeasonStats,
    (r) => r.goals_against,
    (v) => (v === 1 ? "1 conceded" : `${v} conceded`),
    false,
  );
  const highestPoints = toTeamSeasonHolders(
    teamSeasonStats,
    (r) => r.points,
    (v) => `${v} pts`,
    true,
  );
  const lowestPoints = toTeamSeasonHolders(
    teamSeasonStats,
    (r) => r.points,
    (v) => `${v} pts`,
    false,
  );

  // —— Franchise historical ——
  type FranchiseAgg = {
    franchise_id: string;
    display_name: string;
    season_indices: number[];
    league_title_indices: number[];
    league_titles: number;
    cup_titles: number;
  };

  const franchiseAggs = new Map<string, FranchiseAgg>();

  for (const team of teams) {
    const season = seasonsById.get(team.season_id);
    if (!season) continue;
    const franchiseId = resolveFranchiseId(team.name);
    const idx = seasonIndex.get(season.id);
    if (idx == null) continue;
    let agg = franchiseAggs.get(franchiseId);
    if (!agg) {
      agg = {
        franchise_id: franchiseId,
        display_name: team.name,
        season_indices: [],
        league_title_indices: [],
        league_titles: 0,
        cup_titles: 0,
      };
      franchiseAggs.set(franchiseId, agg);
    }
    agg.season_indices.push(idx);
  }

  // Display name = team name from the franchise’s latest season.
  for (const [franchiseId, agg] of franchiseAggs) {
    let bestStarts = "";
    let bestName = agg.display_name;
    for (const team of teams) {
      if (resolveFranchiseId(team.name) !== franchiseId) continue;
      const season = seasonsById.get(team.season_id);
      const starts = season?.starts_on ?? "";
      if (starts >= bestStarts) {
        bestStarts = starts;
        bestName = team.name;
      }
    }
    agg.display_name = bestName;
  }

  for (const honour of honours) {
    if (!honour.season_id || !honour.team_id) continue;
    const team = teamsById.get(honour.team_id);
    const season = seasonsById.get(honour.season_id);
    if (!team || !season) continue;
    const franchiseId = resolveFranchiseId(team.name);
    const agg = franchiseAggs.get(franchiseId);
    if (!agg) continue;
    const idx = seasonIndex.get(season.id);
    if (idx == null) continue;
    const title = honour.title.trim().toLowerCase();
    if (title === LEAGUE_TITLE) {
      agg.league_titles += 1;
      agg.league_title_indices.push(idx);
    } else if (title === CUP_TITLE) {
      agg.cup_titles += 1;
    }
  }

  const franchiseList = [...franchiseAggs.values()];

  const toFranchiseHolders = (
    list: { name: string; value: number; value_label: string }[],
  ) =>
    unwrapHolders(
      list.map((row) => ({
        kind: "team" as const,
        name: row.name,
        player_id: null,
        link_team_id: linkForTeamName(row.name),
        team_name: row.name,
        season_name: null,
        value_label: row.value_label,
        value: row.value,
      })),
      true,
      { requirePositive: true },
    );

  const mostSilverware = toFranchiseHolders(
    franchiseList.map((f) => {
      const value = f.league_titles + f.cup_titles;
      return {
        name: f.display_name,
        value,
        value_label: value === 1 ? "1 trophy" : `${value} trophies`,
      };
    }),
  );
  const mostLeagueTitles = toFranchiseHolders(
    franchiseList.map((f) => ({
      name: f.display_name,
      value: f.league_titles,
      value_label:
        f.league_titles === 1 ? "1 title" : `${f.league_titles} titles`,
    })),
  );
  const mostCupTitles = toFranchiseHolders(
    franchiseList.map((f) => ({
      name: f.display_name,
      value: f.cup_titles,
      value_label: f.cup_titles === 1 ? "1 cup" : `${f.cup_titles} cups`,
    })),
  );
  const mostSeasonsPlayed = toFranchiseHolders(
    franchiseList.map((f) => {
      const value = new Set(f.season_indices).size;
      return {
        name: f.display_name,
        value,
        value_label: value === 1 ? "1 season" : `${value} seasons`,
      };
    }),
  );
  const mostConsecutiveSeasons = toFranchiseHolders(
    franchiseList.map((f) => {
      const value = longestConsecutive(f.season_indices);
      return {
        name: f.display_name,
        value,
        value_label: value === 1 ? "1 season" : `${value} seasons`,
      };
    }),
  );
  const mostConsecutiveLeagueTitles = toFranchiseHolders(
    franchiseList.map((f) => {
      const value = longestConsecutive(f.league_title_indices);
      return {
        name: f.display_name,
        value,
        value_label: value === 1 ? "1 title" : `${value} titles`,
      };
    }),
  );

  const push = (list: (RecordEntry | null)[], item: RecordEntry | null) => {
    if (item) list.push(item);
  };

  const playerCareer: RecordEntry[] = [];
  push(
    playerCareer,
    entry(
      "player.career.goals",
      "Most Dream League Career Goals",
      careerGoalHolders,
    ),
  );
  push(
    playerCareer,
    entry(
      "player.career.league-titles",
      "Most League Titles",
      leagueTitleHolders,
      "Counted when the player was owned by the League Champions at any point in that season.",
    ),
  );
  push(
    playerCareer,
    entry(
      "player.career.cup-titles",
      "Most Cup Wins",
      cupTitleHolders,
      "Counted when the player was owned by the Cup Winners at any point in that season.",
    ),
  );
  push(
    playerCareer,
    entry(
      "player.career.combined-honours",
      "Most Combined Honours (League + Cup)",
      combinedHonourHolders,
      "BFL Challenge titles are omitted — only one historical season records a BFL winner.",
    ),
  );

  const playerSeason: RecordEntry[] = [];
  push(
    playerSeason,
    entry(
      "player.season.goals",
      "Best Single Season Goalscoring Record",
      bestSeasonHolders,
    ),
  );
  push(
    playerSeason,
    entry("player.season.def", "Best Defender Season", bestDefHolders),
  );
  push(
    playerSeason,
    entry("player.season.mid", "Best Midfielder Season", bestMidHolders),
  );
  push(
    playerSeason,
    entry("player.season.fwd", "Best Forward Season", bestFwdHolders),
  );
  push(
    playerSeason,
    entry(
      "player.season.gk-conceded",
      "Worst Conceding Goalkeeper Season",
      worstGkHolders,
      "Goalkeeper assets are real-life clubs. Highest goals conceded in a completed season.",
    ),
  );

  const playerTransfer: RecordEntry[] = [];
  push(
    playerTransfer,
    entry(
      "player.transfer.best",
      "Best Transfer Ever",
      bestTransferHolders,
      "Highest Dream League goals scored for a team after a mid-season transfer-in. Acquisition cost is not stored, so bargain records are omitted.",
    ),
  );
  // Biggest Bargain, Most Traded, Longest Serving — omitted (cost / date confidence).

  const teamSeason: RecordEntry[] = [];
  push(
    teamSeason,
    entry("team.season.highest-gf", "Highest Goals Scored", highestGf),
  );
  push(
    teamSeason,
    entry("team.season.fewest-gf", "Fewest Goals Scored", fewestGf),
  );
  push(
    teamSeason,
    entry("team.season.highest-ga", "Highest Goals Conceded", highestGa),
  );
  push(
    teamSeason,
    entry("team.season.fewest-ga", "Fewest Goals Conceded", fewestGa),
  );
  push(
    teamSeason,
    entry("team.season.highest-points", "Highest Points Total", highestPoints),
  );
  push(
    teamSeason,
    entry("team.season.lowest-points", "Lowest Points Total", lowestPoints),
  );

  const teamHistorical: RecordEntry[] = [];
  push(
    teamHistorical,
    entry(
      "team.historical.silverware",
      "Most Silverware",
      mostSilverware,
      "League Champions + Cup Winners only.",
    ),
  );
  push(
    teamHistorical,
    entry("team.historical.league-titles", "Most League Titles", mostLeagueTitles),
  );
  push(
    teamHistorical,
    entry("team.historical.cup-titles", "Most Cup Titles", mostCupTitles),
  );
  // Most BFL Titles omitted — only 2025/26 seeded.
  push(
    teamHistorical,
    entry(
      "team.historical.seasons-played",
      "Most Seasons Played",
      mostSeasonsPlayed,
    ),
  );
  push(
    teamHistorical,
    entry(
      "team.historical.consecutive-seasons",
      "Most Consecutive Seasons",
      mostConsecutiveSeasons,
    ),
  );
  push(
    teamHistorical,
    entry(
      "team.historical.consecutive-league-titles",
      "Most Consecutive League Titles",
      mostConsecutiveLeagueTitles,
    ),
  );

  const sections: RecordsSection[] = [
    {
      id: "player",
      title: "Player Records",
      groups: [
        { id: "player.career", title: "Career Records", records: playerCareer },
        {
          id: "player.season",
          title: "Single Season Records",
          records: playerSeason,
        },
        {
          id: "player.transfer",
          title: "Transfer Records",
          records: playerTransfer,
        },
      ].filter((g) => g.records.length > 0),
    },
    {
      id: "team",
      title: "Team Records",
      groups: [
        { id: "team.season", title: "Season Records", records: teamSeason },
        {
          id: "team.historical",
          title: "Historical Records",
          records: teamHistorical,
        },
      ].filter((g) => g.records.length > 0),
    },
  ].filter((s) => s.groups.length > 0);

  const completedNames = completedSeasons.map((s) => s.name).join(", ");

  return {
    status: "ok",
    data: {
      sections,
      season_scope_note: completedSeasons.length
        ? `Season-scoped records use completed seasons only (${completedNames}). Career and franchise records include all imported history.`
        : null,
    },
  };
}
