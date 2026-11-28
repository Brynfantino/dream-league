import { connection } from "next/server";

import { canonicalizeClubName } from "@/lib/league/club-aliases";
import { resolveFranchiseId } from "@/lib/league/franchise-map";
import type {
  InsightCard,
  InsightGroup,
  InsightSubject,
  InsightsPageData,
} from "@/lib/league/insights-shared";
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
  Honour,
  Player,
  PlayerPosition,
  Season,
  SquadMembership,
  Team,
} from "@/types/database";

export type InsightsResult =
  | { status: "ok"; data: InsightsPageData }
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
  "team_id" | "season_id" | "event_type" | "player_id"
>;
type HonourRow = Pick<Honour, "season_id" | "team_id" | "title">;
type MembershipRow = Pick<
  SquadMembership,
  "season_id" | "team_id" | "player_id" | "acquired_at" | "released_at"
>;

const POSITION_LABEL: Record<PlayerPosition, string> = {
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

function playerSubject(
  name: string,
  playerId: string | null,
  extras?: Partial<InsightSubject>,
): InsightSubject {
  return {
    name,
    player_id: playerId,
    link_team_id: null,
    is_team: false,
    context: null,
    context_link_team_id: null,
    ...extras,
  };
}

function teamSubject(
  name: string,
  linkTeamId: string | null,
  extras?: Partial<InsightSubject>,
): InsightSubject {
  return {
    name,
    player_id: null,
    link_team_id: linkTeamId,
    is_team: true,
    context: null,
    context_link_team_id: null,
    ...extras,
  };
}

function clubSubject(name: string): InsightSubject {
  return {
    name,
    player_id: null,
    link_team_id: null,
    is_team: false,
    context: null,
    context_link_team_id: null,
  };
}

type Ranked<T> = { item: T; value: number };

function topRanked<T>(
  items: Ranked<T>[],
  preferHigher: boolean,
  options?: { requirePositive?: boolean },
): { best: Ranked<T>[]; runnersUp: Ranked<T>[] } {
  if (items.length === 0) return { best: [], runnersUp: [] };
  const sorted = [...items].sort((a, b) =>
    preferHigher ? b.value - a.value : a.value - b.value,
  );
  const bestValue = sorted[0]!.value;
  if (options?.requirePositive && preferHigher && bestValue <= 0) {
    return { best: [], runnersUp: [] };
  }
  const best = sorted.filter((r) => r.value === bestValue);
  const runnersUp = sorted
    .filter((r) => r.value !== bestValue)
    .slice(0, 3);
  return { best, runnersUp };
}

function cardFromRanked<T>(args: {
  id: string;
  title: string;
  blurb?: string;
  ranked: { best: Ranked<T>[]; runnersUp: Ranked<T>[] };
  toSubject: (item: T) => InsightSubject;
  formatValue: (value: number) => string;
}): InsightCard | null {
  if (args.ranked.best.length === 0) return null;
  return {
    id: args.id,
    title: args.title,
    blurb: args.blurb,
    value_label: args.formatValue(args.ranked.best[0]!.value),
    subjects: args.ranked.best.map((r) => args.toSubject(r.item)),
    runners_up:
      args.ranked.runnersUp.length > 0
        ? args.ranked.runnersUp.map((r) => ({
            subject: args.toSubject(r.item),
            value_label: args.formatValue(r.value),
          }))
        : undefined,
  };
}

/**
 * League-wide Insights — interesting facts, not pure “who was best” records.
 * Omits insights that need acquisition cost, RL league tiers, or unreliable tenure.
 */
export async function loadInsights(): Promise<InsightsResult> {
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
        .select("team_id, season_id, event_type, player_id")
        .range(from, to),
    ),
    supabase
      .from("honours")
      .select("season_id, team_id, title")
      .in("title", ["League Champions", "Cup Winners"]),
    fetchAllRows<MembershipRow>((from, to) =>
      supabase
        .from("squad_memberships")
        .select("season_id, team_id, player_id, acquired_at, released_at")
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

  const seasons = (seasonsRes.data ?? []) as SeasonRow[];
  const teams = teamsRes.data ?? [];
  const players = playersRes.data ?? [];
  const events = eventsRes.data ?? [];
  const honours = (honoursRes.data ?? []) as HonourRow[];
  const memberships = membershipsRes.data ?? [];

  const seasonsById = new Map(seasons.map((s) => [s.id, s]));
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const playersById = new Map(players.map((p) => [p.id, p]));
  const completedSeasons = seasons.filter((s) => !s.is_active);

  const activeSeason = seasons.find((s) => s.is_active) ?? null;
  const activeTeams = activeSeason
    ? teams.filter((t) => t.season_id === activeSeason.id)
    : [];
  const activeByFranchise = mapActiveTeamIdsByFranchise(activeTeams);
  const linkFor = (name: string) => linkTeamIdForName(name, activeByFranchise);

  const playerIdByName = new Map<string, string>();
  for (const player of players) {
    const existing = playerIdByName.get(player.name);
    if (!existing) {
      playerIdByName.set(player.name, player.id);
      continue;
    }
    const prev = playersById.get(existing);
    if (prev && !prev.club && player.club) {
      playerIdByName.set(player.name, player.id);
    }
  }

  // Latest display name per franchise
  const displayByFranchise = new Map<string, string>();
  const bestStarts = new Map<string, string>();
  for (const team of teams) {
    const fid = resolveFranchiseId(team.name);
    const starts = seasonsById.get(team.season_id)?.starts_on ?? "";
    if ((bestStarts.get(fid) ?? "") <= starts) {
      bestStarts.set(fid, starts);
      displayByFranchise.set(fid, team.name);
    }
  }

  const cards: InsightCard[] = [];
  const push = (c: InsightCard | null) => {
    if (c) cards.push(c);
  };

  // —— Player: most owned (distinct franchises) ——
  const franchisesByPlayer = new Map<string, Set<string>>();
  for (const m of memberships) {
    const player = playersById.get(m.player_id);
    const team = teamsById.get(m.team_id);
    if (!player || !team) continue;
    const set = franchisesByPlayer.get(player.name) ?? new Set<string>();
    set.add(resolveFranchiseId(team.name));
    franchisesByPlayer.set(player.name, set);
  }
  push(
    cardFromRanked({
      id: "player.most-owned",
      title: "Most Owned Player",
      blurb: "Passed through the most Dream League franchises.",
      ranked: topRanked(
        [...franchisesByPlayer.entries()].map(([name, set]) => ({
          item: name,
          value: set.size,
        })),
        true,
        { requirePositive: true },
      ),
      toSubject: (name) => playerSubject(name, playerIdByName.get(name) ?? null),
      formatValue: (v) => (v === 1 ? "1 franchise" : `${v} franchises`),
    }),
  );

  // —— Player: most traded (mid-season transfer-ins only) ——
  const transferInsByPlayer = new Map<string, number>();
  for (const m of memberships) {
    const season = seasonsById.get(m.season_id);
    const player = playersById.get(m.player_id);
    if (!season || !player) continue;
    if (!isTransferIn(m.acquired_at, season.starts_on)) continue;
    transferInsByPlayer.set(
      player.name,
      (transferInsByPlayer.get(player.name) ?? 0) + 1,
    );
  }
  push(
    cardFromRanked({
      id: "player.most-traded",
      title: "Most Traded Player",
      blurb:
        "Most mid-season transfer-ins (auction day ownership is excluded).",
      ranked: topRanked(
        [...transferInsByPlayer.entries()].map(([name, value]) => ({
          item: name,
          value,
        })),
        true,
        { requirePositive: true },
      ),
      toSubject: (name) => playerSubject(name, playerIdByName.get(name) ?? null),
      formatValue: (v) => (v === 1 ? "1 transfer-in" : `${v} transfer-ins`),
    }),
  );

  // —— Player: most decorated (league + cup) ——
  const ownedTeamSeasons = new Map<string, Set<string>>();
  for (const m of memberships) {
    const player = playersById.get(m.player_id);
    if (!player) continue;
    const set = ownedTeamSeasons.get(player.name) ?? new Set<string>();
    set.add(`${m.season_id}::${m.team_id}`);
    ownedTeamSeasons.set(player.name, set);
  }
  const decorations = new Map<string, number>();
  for (const honour of honours) {
    if (!honour.season_id || !honour.team_id) continue;
    const key = `${honour.season_id}::${honour.team_id}`;
    const title = honour.title.trim().toLowerCase();
    if (title !== "league champions" && title !== "cup winners") continue;
    for (const [name, owned] of ownedTeamSeasons) {
      if (!owned.has(key)) continue;
      decorations.set(name, (decorations.get(name) ?? 0) + 1);
    }
  }
  push(
    cardFromRanked({
      id: "player.most-decorated",
      title: "Most Decorated Player",
      blurb: "League and Cup medals while owned by the winning side.",
      ranked: topRanked(
        [...decorations.entries()].map(([name, value]) => ({
          item: name,
          value,
        })),
        true,
        { requirePositive: true },
      ),
      toSubject: (name) => playerSubject(name, playerIdByName.get(name) ?? null),
      formatValue: (v) => (v === 1 ? "1 honour" : `${v} honours`),
    }),
  );

  // —— Player: most successful player/owner combo (goals for a franchise) ——
  type Combo = { player: string; franchise_id: string; team_name: string };
  const goalsByCombo = new Map<string, { combo: Combo; goals: number }>();
  for (const event of events) {
    if (event.event_type !== "outfield_goal" || !event.player_id) continue;
    const player = playersById.get(event.player_id);
    const team = teamsById.get(event.team_id);
    if (!player || !team) continue;
    const franchiseId = resolveFranchiseId(team.name);
    const key = `${player.name}::${franchiseId}`;
    const existing = goalsByCombo.get(key);
    if (!existing) {
      goalsByCombo.set(key, {
        combo: {
          player: player.name,
          franchise_id: franchiseId,
          team_name: displayByFranchise.get(franchiseId) ?? team.name,
        },
        goals: 1,
      });
    } else {
      existing.goals += 1;
    }
  }
  push(
    cardFromRanked({
      id: "player.best-combo",
      title: "Most Successful Player / Owner Combination",
      blurb: "Most Dream League goals scored while owned by one franchise.",
      ranked: topRanked(
        [...goalsByCombo.values()].map((row) => ({
          item: row.combo,
          value: row.goals,
        })),
        true,
        { requirePositive: true },
      ),
      toSubject: (combo) =>
        playerSubject(combo.player, playerIdByName.get(combo.player) ?? null, {
          context: combo.team_name,
          context_link_team_id: linkFor(combo.team_name),
        }),
      formatValue: (v) => (v === 1 ? "1 goal together" : `${v} goals together`),
    }),
  );

  // —— Club: most represented ——
  const playersByClub = new Map<string, Set<string>>();
  for (const player of players) {
    const club = canonicalizeClubName(player.club);
    if (!club) continue;
    const set = playersByClub.get(club) ?? new Set<string>();
    set.add(player.name);
    playersByClub.set(club, set);
  }
  push(
    cardFromRanked({
      id: "club.most-represented",
      title: "Most Represented Real-Life Club",
      blurb: "Supplied the widest pool of Dream League footballers.",
      ranked: topRanked(
        [...playersByClub.entries()].map(([club, set]) => ({
          item: club,
          value: set.size,
        })),
        true,
        { requirePositive: true },
      ),
      toSubject: (club) => clubSubject(club),
      formatValue: (v) => (v === 1 ? "1 player" : `${v} players`),
    }),
  );

  // —— Club: most goals ——
  const goalsByClub = new Map<string, number>();
  for (const event of events) {
    if (event.event_type !== "outfield_goal" || !event.player_id) continue;
    const player = playersById.get(event.player_id);
    const club = player ? canonicalizeClubName(player.club) : null;
    if (!club) continue;
    goalsByClub.set(club, (goalsByClub.get(club) ?? 0) + 1);
  }
  push(
    cardFromRanked({
      id: "club.most-goals",
      title: "Most Dream League Goals From A Real-Life Club",
      blurb: "Goals attributed via the scorer’s recorded club.",
      ranked: topRanked(
        [...goalsByClub.entries()].map(([club, value]) => ({
          item: club,
          value,
        })),
        true,
        { requirePositive: true },
      ),
      toSubject: (club) => clubSubject(club),
      formatValue: (v) => (v === 1 ? "1 goal" : `${v} goals`),
    }),
  );

  // —— Club: most successful (titles via owned assets) ——
  const titlesByClub = new Map<string, number>();
  for (const honour of honours) {
    if (!honour.season_id || !honour.team_id) continue;
    const title = honour.title.trim().toLowerCase();
    if (title !== "league champions" && title !== "cup winners") continue;
    const seasonPlayers = new Set<string>();
    for (const m of memberships) {
      if (m.season_id !== honour.season_id || m.team_id !== honour.team_id) {
        continue;
      }
      const player = playersById.get(m.player_id);
      if (!player) continue;
      const club = canonicalizeClubName(player.club);
      if (!club) continue;
      // One credit per club per honour (not per player)
      seasonPlayers.add(club);
    }
    for (const club of seasonPlayers) {
      titlesByClub.set(club, (titlesByClub.get(club) ?? 0) + 1);
    }
  }
  push(
    cardFromRanked({
      id: "club.most-titles",
      title: "Most Successful Real-Life Club",
      blurb:
        "League or Cup seasons where that club had an asset on the winning Dream League side.",
      ranked: topRanked(
        [...titlesByClub.entries()].map(([club, value]) => ({
          item: club,
          value,
        })),
        true,
        { requirePositive: true },
      ),
      toSubject: (club) => clubSubject(club),
      formatValue: (v) => (v === 1 ? "1 title season" : `${v} title seasons`),
    }),
  );

  // —— Franchise season stats (completed) ——
  type FranchiseSeason = {
    franchise_id: string;
    season_id: string;
    position: number;
    points: number;
    gf: number;
  };
  const franchiseSeasons: FranchiseSeason[] = [];
  const transferInsByFranchise = new Map<string, number>();

  for (const season of completedSeasons) {
    const seasonTeams = teams.filter((t) => t.season_id === season.id);
    if (seasonTeams.length === 0) continue;
    const seasonEvents = events.filter((e) => e.season_id === season.id);
    const standings = deriveStandings(
      seasonTeams.map((t) => ({ id: t.id, name: t.name })),
      seasonEvents,
    );
    for (const row of standings) {
      const franchiseId = resolveFranchiseId(row.team_name);
      franchiseSeasons.push({
        franchise_id: franchiseId,
        season_id: season.id,
        position: row.position,
        points: row.points,
        gf: row.goals_for,
      });
    }
  }

  for (const m of memberships) {
    const season = seasonsById.get(m.season_id);
    const team = teamsById.get(m.team_id);
    if (!season || !team) continue;
    if (!isTransferIn(m.acquired_at, season.starts_on)) continue;
    const fid = resolveFranchiseId(team.name);
    transferInsByFranchise.set(
      fid,
      (transferInsByFranchise.get(fid) ?? 0) + 1,
    );
  }

  type FranchiseAgg = {
    franchise_id: string;
    seasons: number;
    points_sum: number;
    position_sum: number;
  };
  const franchiseAggs = new Map<string, FranchiseAgg>();
  for (const row of franchiseSeasons) {
    const agg = franchiseAggs.get(row.franchise_id) ?? {
      franchise_id: row.franchise_id,
      seasons: 0,
      points_sum: 0,
      position_sum: 0,
    };
    agg.seasons += 1;
    agg.points_sum += row.points;
    agg.position_sum += row.position;
    franchiseAggs.set(row.franchise_id, agg);
  }

  // Best average finish (min avg position), require ≥2 seasons
  push(
    cardFromRanked({
      id: "franchise.best-avg-finish",
      title: "Best Average League Finish",
      blurb: "Lowest average finishing position across completed seasons (min. 2).",
      ranked: topRanked(
        [...franchiseAggs.values()]
          .filter((f) => f.seasons >= 2)
          .map((f) => ({
            item: f.franchise_id,
            value: Math.round((f.position_sum / f.seasons) * 100) / 100,
          })),
        false,
      ),
      toSubject: (fid) => {
        const name = displayByFranchise.get(fid) ?? fid;
        return teamSubject(name, linkFor(name));
      },
      formatValue: (v) => `Avg ${v}`,
    }),
  );

  push(
    cardFromRanked({
      id: "franchise.highest-avg-points",
      title: "Highest Average Points Per Season",
      blurb: "Completed seasons only (min. 2 campaigns).",
      ranked: topRanked(
        [...franchiseAggs.values()]
          .filter((f) => f.seasons >= 2)
          .map((f) => ({
            item: f.franchise_id,
            value: Math.round((f.points_sum / f.seasons) * 10) / 10,
          })),
        true,
      ),
      toSubject: (fid) => {
        const name = displayByFranchise.get(fid) ?? fid;
        return teamSubject(name, linkFor(name));
      },
      formatValue: (v) => `${v} pts / season`,
    }),
  );

  // Include franchises with 0 transfers for least active
  for (const fid of franchiseAggs.keys()) {
    if (!transferInsByFranchise.has(fid)) transferInsByFranchise.set(fid, 0);
  }

  push(
    cardFromRanked({
      id: "franchise.most-active",
      title: "Most Active Franchise",
      blurb: "Highest mid-season outfield transfer-in count across history.",
      ranked: topRanked(
        [...transferInsByFranchise.entries()].map(([fid, value]) => ({
          item: fid,
          value,
        })),
        true,
        { requirePositive: true },
      ),
      toSubject: (fid) => {
        const name = displayByFranchise.get(fid) ?? fid;
        return teamSubject(name, linkFor(name));
      },
      formatValue: (v) => (v === 1 ? "1 transfer-in" : `${v} transfer-ins`),
    }),
  );

  push(
    cardFromRanked({
      id: "franchise.least-active",
      title: "Least Active Franchise",
      blurb:
        "Fewest mid-season outfield transfer-ins among franchises with at least one completed season.",
      ranked: topRanked(
        [...transferInsByFranchise.entries()]
          .filter(([fid]) => franchiseAggs.has(fid))
          .map(([fid, value]) => ({ item: fid, value })),
        false,
      ),
      toSubject: (fid) => {
        const name = displayByFranchise.get(fid) ?? fid;
        return teamSubject(name, linkFor(name));
      },
      formatValue: (v) => (v === 1 ? "1 transfer-in" : `${v} transfer-ins`),
    }),
  );

  // Biggest rise / fall between consecutive completed seasons
  type Swing = {
    franchise_id: string;
    from_season: string;
    to_season: string;
    delta: number;
  };
  const rises: Ranked<Swing>[] = [];
  const falls: Ranked<Swing>[] = [];
  const byFranchiseSeasons = new Map<string, FranchiseSeason[]>();
  for (const row of franchiseSeasons) {
    const list = byFranchiseSeasons.get(row.franchise_id) ?? [];
    list.push(row);
    byFranchiseSeasons.set(row.franchise_id, list);
  }
  for (const [fid, rows] of byFranchiseSeasons) {
    const ordered = [...rows].sort((a, b) => {
      const sa = seasonsById.get(a.season_id)?.starts_on ?? "";
      const sb = seasonsById.get(b.season_id)?.starts_on ?? "";
      return sa.localeCompare(sb);
    });
    for (let i = 1; i < ordered.length; i++) {
      const prev = ordered[i - 1]!;
      const next = ordered[i]!;
      // Lower position number = better; rise = prev.position - next.position
      const improvement = prev.position - next.position;
      const swing: Swing = {
        franchise_id: fid,
        from_season: seasonsById.get(prev.season_id)?.name ?? "",
        to_season: seasonsById.get(next.season_id)?.name ?? "",
        delta: improvement,
      };
      if (improvement > 0) {
        rises.push({ item: swing, value: improvement });
      } else if (improvement < 0) {
        falls.push({ item: swing, value: Math.abs(improvement) });
      }
    }
  }

  push(
    cardFromRanked({
      id: "franchise.biggest-rise",
      title: "Biggest Rise Between Seasons",
      blurb: "Largest improvement in finishing position season-to-season.",
      ranked: topRanked(rises, true, { requirePositive: true }),
      toSubject: (swing) => {
        const name =
          displayByFranchise.get(swing.franchise_id) ?? swing.franchise_id;
        return teamSubject(name, linkFor(name), {
          context: `${swing.from_season} → ${swing.to_season}`,
        });
      },
      formatValue: (v) => (v === 1 ? "Up 1 place" : `Up ${v} places`),
    }),
  );

  push(
    cardFromRanked({
      id: "franchise.biggest-fall",
      title: "Biggest Fall Between Seasons",
      blurb: "Largest drop in finishing position season-to-season.",
      ranked: topRanked(falls, true, { requirePositive: true }),
      toSubject: (swing) => {
        const name =
          displayByFranchise.get(swing.franchise_id) ?? swing.franchise_id;
        return teamSubject(name, linkFor(name), {
          context: `${swing.from_season} → ${swing.to_season}`,
        });
      },
      formatValue: (v) => (v === 1 ? "Down 1 place" : `Down ${v} places`),
    }),
  );

  // —— League: most popular position ——
  const positionCounts = new Map<PlayerPosition, number>();
  for (const m of memberships) {
    const player = playersById.get(m.player_id);
    if (!player) continue;
    positionCounts.set(
      player.position,
      (positionCounts.get(player.position) ?? 0) + 1,
    );
  }
  push(
    cardFromRanked({
      id: "league.popular-position",
      title: "Most Popular Position",
      blurb: "Based on outfield ownership stints across all seasons.",
      ranked: topRanked(
        [...positionCounts.entries()].map(([position, value]) => ({
          item: position,
          value,
        })),
        true,
        { requirePositive: true },
      ),
      toSubject: (position) => clubSubject(POSITION_LABEL[position]),
      formatValue: (v) => (v === 1 ? "1 stint" : `${v} stints`),
    }),
  );

  // —— League: highest scoring season / avg goals per team ——
  type SeasonScoring = {
    season_id: string;
    name: string;
    total_gf: number;
    teams: number;
    avg: number;
  };
  const seasonScoring: SeasonScoring[] = [];
  for (const season of completedSeasons) {
    const seasonTeams = teams.filter((t) => t.season_id === season.id);
    if (seasonTeams.length === 0) continue;
    const seasonEvents = events.filter((e) => e.season_id === season.id);
    const standings = deriveStandings(
      seasonTeams.map((t) => ({ id: t.id, name: t.name })),
      seasonEvents,
    );
    const total_gf = standings.reduce((sum, row) => sum + row.goals_for, 0);
    seasonScoring.push({
      season_id: season.id,
      name: season.name,
      total_gf,
      teams: seasonTeams.length,
      avg: Math.round((total_gf / seasonTeams.length) * 10) / 10,
    });
  }

  push(
    cardFromRanked({
      id: "league.highest-scoring-season",
      title: "Highest Scoring Dream League Season",
      blurb: "Total goals scored league-wide in a completed season.",
      ranked: topRanked(
        seasonScoring.map((s) => ({ item: s, value: s.total_gf })),
        true,
        { requirePositive: true },
      ),
      toSubject: (s) => clubSubject(s.name),
      formatValue: (v) => (v === 1 ? "1 goal" : `${v} goals`),
    }),
  );

  push(
    cardFromRanked({
      id: "league.highest-avg-goals",
      title: "Highest Average Goals Per Team Season",
      blurb: "Goals for ÷ teams in a completed season.",
      ranked: topRanked(
        seasonScoring.map((s) => ({ item: s, value: s.avg })),
        true,
        { requirePositive: true },
      ),
      toSubject: (s) => clubSubject(s.name),
      formatValue: (v) => `${v} goals / team`,
    }),
  );

  // Group cards
  const byPrefix = (prefix: string) =>
    cards.filter((c) => c.id.startsWith(prefix));

  const groups: InsightGroup[] = [
    { id: "player", title: "Player Insights", cards: byPrefix("player.") },
    { id: "club", title: "Real-Life Club Insights", cards: byPrefix("club.") },
    {
      id: "franchise",
      title: "Franchise Insights",
      cards: byPrefix("franchise."),
    },
    { id: "league", title: "League Insights", cards: byPrefix("league.") },
  ].filter((g) => g.cards.length > 0);

  return {
    status: "ok",
    data: {
      groups,
      note:
        "Longest-serving tenure and real-life league popularity are omitted — ownership dates are incomplete for some seasons, and club league tiers are not stored. BFL-only insights are excluded for the same historical coverage reason as Records.",
    },
  };
}
