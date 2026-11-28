import { connection } from "next/server";

import { canonicalizeClubName } from "@/lib/league/club-aliases";
import {
  deriveGoalkeeperTransfers,
  deriveOutfieldTransfers,
  type GoalkeeperStintSeed,
  type OutfieldStintSeed,
} from "@/lib/league/derive-transfers";
import {
  FRANCHISES,
  resolveFranchiseId,
} from "@/lib/league/franchise-map";
import type {
  FranchiseGoalkeeperTransfer,
  FranchiseHistoryOption,
  FranchiseHistorySnapshot,
  FranchiseOutfieldTransfer,
  FranchiseSeasonOption,
} from "@/lib/league/franchise-history-shared";
import { deriveStandings } from "@/lib/league/standings";
import {
  countGoalkeeperConcessions,
  countGoalkeeperConcessionsInStints,
  countOutfieldGoalsByPlayer,
  countOutfieldGoalsInStints,
  goalkeeperContribution,
  outfieldContribution,
  sortOutfieldSquad,
  type OwnershipStint,
  type SquadGoalkeeper,
  type SquadOutfieldMember,
} from "@/lib/league/team-detail";
import {
  deriveTransferUsage,
  isTransferIn,
  toDateOnly,
} from "@/lib/league/transfer-usage";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { createClient } from "@/lib/supabase/server";
import type {
  GoalEvent,
  GoalkeeperClub,
  Honour,
  Player,
  PlayerPosition,
  Season,
  Team,
  TeamManager,
} from "@/types/database";

export type {
  FranchiseHistoryOption,
  FranchiseHistorySnapshot,
  FranchiseSeasonOption,
} from "@/lib/league/franchise-history-shared";

export type FranchiseHistoryResult =
  | { status: "unconfigured" }
  | { status: "no_data" }
  | { status: "error"; message: string }
  | {
      status: "ok";
      franchises: FranchiseHistoryOption[];
      seasons: FranchiseSeasonOption[];
      selected_franchise_id: string;
      selected_season_id: string;
      snapshot: FranchiseHistorySnapshot;
    };

type SeasonRow = Pick<
  Season,
  "id" | "name" | "starts_on" | "ends_on" | "is_active"
>;
type TeamRow = Pick<Team, "id" | "name" | "season_id">;

const HONOUR_TITLES = [
  "League Champions",
  "Cup Winners",
  "BFL Challenge Winners",
] as const;

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Historical franchise snapshot for one franchise + season.
 * End-of-season squad = memberships with released_at IS NULL.
 */
export async function loadFranchiseHistory(
  franchiseId: string | null,
  seasonId: string | null,
): Promise<FranchiseHistoryResult> {
  await connection();

  const supabase = await createClient();
  if (!supabase) {
    return { status: "unconfigured" };
  }

  const [seasonsRes, teamsRes] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name, starts_on, ends_on, is_active")
      .order("starts_on", { ascending: false }),
    fetchAllRows<TeamRow>((from, to) =>
      supabase
        .from("teams")
        .select("id, name, season_id")
        .order("name")
        .range(from, to),
    ),
  ]);

  if (seasonsRes.error) {
    return { status: "error", message: seasonsRes.error.message };
  }
  if (teamsRes.error) {
    return { status: "error", message: teamsRes.error.message };
  }

  const seasons = (seasonsRes.data ?? []) as SeasonRow[];
  const teams = teamsRes.data ?? [];
  if (seasons.length === 0 || teams.length === 0) {
    return { status: "no_data" };
  }

  const seasonsById = new Map(seasons.map((s) => [s.id, s]));

  // franchise_id → season ids (newest first via seasons order)
  const seasonsByFranchise = new Map<string, string[]>();
  const latestNameByFranchise = new Map<string, { name: string; starts: string }>();

  for (const team of teams) {
    const season = seasonsById.get(team.season_id);
    if (!season) continue;
    const fid = resolveFranchiseId(team.name);
    const list = seasonsByFranchise.get(fid) ?? [];
    if (!list.includes(season.id)) list.push(season.id);
    seasonsByFranchise.set(fid, list);

    const starts = season.starts_on ?? "";
    const prev = latestNameByFranchise.get(fid);
    if (!prev || starts >= prev.starts) {
      latestNameByFranchise.set(fid, { name: team.name, starts });
    }
  }

  // Sort each franchise's seasons by starts_on desc
  for (const [fid, ids] of seasonsByFranchise) {
    ids.sort((a, b) => {
      const sa = seasonsById.get(a)?.starts_on ?? "";
      const sb = seasonsById.get(b)?.starts_on ?? "";
      return sb.localeCompare(sa);
    });
    seasonsByFranchise.set(fid, ids);
  }

  const franchiseIds = [...seasonsByFranchise.keys()];
  const franchises: FranchiseHistoryOption[] = franchiseIds
    .map((id) => {
      const fromMap = FRANCHISES.find((f) => f.id === id);
      const label =
        latestNameByFranchise.get(id)?.name ??
        fromMap?.canonicalName ??
        id.replace(/^unmapped:/, "");
      return { id, label };
    })
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
    );

  if (franchises.length === 0) {
    return { status: "no_data" };
  }

  const preferredDefault =
    franchises.find((f) => f.id === "durham-dynamo") ?? franchises[0]!;
  const selectedFranchise =
    franchises.find((f) => f.id === franchiseId) ?? preferredDefault;

  const franchiseSeasonIds =
    seasonsByFranchise.get(selectedFranchise.id) ?? [];
  const seasonOptions: FranchiseSeasonOption[] = franchiseSeasonIds
    .map((id) => seasonsById.get(id))
    .filter((s): s is SeasonRow => Boolean(s))
    .map((s) => ({
      id: s.id,
      name: s.name,
      is_active: s.is_active,
    }));

  if (seasonOptions.length === 0) {
    return { status: "no_data" };
  }

  const defaultSeason =
    seasonOptions.find((s) => !s.is_active) ?? seasonOptions[0]!;
  const selectedSeasonOption =
    seasonOptions.find((s) => s.id === seasonId) ?? defaultSeason;
  const selectedSeason = seasonsById.get(selectedSeasonOption.id)!;

  const team = teams.find(
    (t) =>
      t.season_id === selectedSeason.id &&
      resolveFranchiseId(t.name) === selectedFranchise.id,
  );

  if (!team) {
    return {
      status: "error",
      message: "No team row found for that franchise and season.",
    };
  }

  const seasonTeams = teams.filter((t) => t.season_id === selectedSeason.id);

  const [
    managersRes,
    eventsRes,
    squadRes,
    gkRes,
    allSquadStintsRes,
    allGkStintsRes,
    honoursRes,
  ] = await Promise.all([
    supabase
      .from("team_managers")
      .select("display_name")
      .eq("team_id", team.id)
      .order("display_name"),
    fetchAllRows<
      Pick<
        GoalEvent,
        | "team_id"
        | "event_type"
        | "player_id"
        | "goalkeeper_club_id"
        | "occurred_on"
      >
    >((from, to) =>
      supabase
        .from("goal_events")
        .select(
          "team_id, event_type, player_id, goalkeeper_club_id, occurred_on",
        )
        .eq("season_id", selectedSeason.id)
        .range(from, to),
    ),
    supabase
      .from("squad_memberships")
      .select("player_id, players(id, name, club, position)")
      .eq("season_id", selectedSeason.id)
      .eq("team_id", team.id)
      .is("released_at", null),
    supabase
      .from("goalkeeper_memberships")
      .select("goalkeeper_club_id, goalkeeper_clubs(id, name)")
      .eq("season_id", selectedSeason.id)
      .eq("team_id", team.id)
      .is("released_at", null)
      .maybeSingle(),
    supabase
      .from("squad_memberships")
      .select(
        "player_id, acquired_at, released_at, players(id, name, club, position)",
      )
      .eq("season_id", selectedSeason.id)
      .eq("team_id", team.id),
    supabase
      .from("goalkeeper_memberships")
      .select(
        "goalkeeper_club_id, acquired_at, released_at, goalkeeper_clubs(id, name)",
      )
      .eq("season_id", selectedSeason.id)
      .eq("team_id", team.id),
    supabase
      .from("honours")
      .select("title, team_id, season_id")
      .eq("season_id", selectedSeason.id)
      .eq("team_id", team.id)
      .in("title", [...HONOUR_TITLES]),
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
  if (allSquadStintsRes.error) {
    return { status: "error", message: allSquadStintsRes.error.message };
  }
  if (allGkStintsRes.error) {
    return { status: "error", message: allGkStintsRes.error.message };
  }
  if (honoursRes.error) {
    return { status: "error", message: honoursRes.error.message };
  }

  const allEvents = eventsRes.data ?? [];
  const standings = deriveStandings(
    seasonTeams.map((t) => ({ id: t.id, name: t.name })),
    allEvents,
  );
  const standing = standings.find((row) => row.team_id === team.id);

  const managers = (
    (managersRes.data ?? []) as Pick<TeamManager, "display_name">[]
  ).map((m) => m.display_name);

  const teamEvents = allEvents.filter((e) => e.team_id === team.id);
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
    const player = unwrapOne(row.players);
    if (!player) continue;
    outfield.push({
      player_id: player.id,
      name: player.name,
      club: canonicalizeClubName(player.club),
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
    const club = unwrapOne(gkRow.goalkeeper_clubs);
    if (club) {
      goalkeeper = {
        goalkeeper_club_id: club.id,
        name: canonicalizeClubName(club.name) ?? club.name,
        concessions: countGoalkeeperConcessions(teamEvents, club.id),
      };
    }
  }

  type FullSquadStint = {
    player_id: string;
    acquired_at: string;
    released_at: string | null;
    players:
      | Pick<Player, "id" | "name" | "club" | "position">
      | Pick<Player, "id" | "name" | "club" | "position">[]
      | null;
  };

  type FullGkStint = {
    goalkeeper_club_id: string;
    acquired_at: string;
    released_at: string | null;
    goalkeeper_clubs:
      | Pick<GoalkeeperClub, "id" | "name">
      | Pick<GoalkeeperClub, "id" | "name">[]
      | null;
  };

  const squadStints = (allSquadStintsRes.data ?? []) as FullSquadStint[];
  const gkStints = (allGkStintsRes.data ?? []) as FullGkStint[];

  const transfer_usage = deriveTransferUsage(
    squadStints.map((s) => s.acquired_at),
    gkStints.map((s) => s.acquired_at),
    selectedSeason.starts_on,
  );

  const outfieldSeeds: OutfieldStintSeed[] = [];
  for (const row of squadStints) {
    const player = unwrapOne(row.players);
    if (!player) continue;
    outfieldSeeds.push({
      team_id: team.id,
      player_id: player.id,
      player_name: player.name,
      club: canonicalizeClubName(player.club),
      position: player.position,
      acquired_at: row.acquired_at,
      released_at: row.released_at,
    });
  }

  const gkSeeds: GoalkeeperStintSeed[] = [];
  for (const row of gkStints) {
    const club = unwrapOne(row.goalkeeper_clubs);
    if (!club) continue;
    gkSeeds.push({
      team_id: team.id,
      goalkeeper_club_id: club.id,
      club_name: canonicalizeClubName(club.name) ?? club.name,
      acquired_at: row.acquired_at,
      released_at: row.released_at,
    });
  }

  const teamNameById = new Map([[team.id, team.name]]);
  const outfieldTransfersRaw = deriveOutfieldTransfers(
    outfieldSeeds,
    teamNameById,
    selectedSeason.starts_on,
  );
  const goalkeeperTransfersRaw = deriveGoalkeeperTransfers(
    gkSeeds,
    teamNameById,
    selectedSeason.starts_on,
  );

  const outfieldTransfers: FranchiseOutfieldTransfer[] =
    outfieldTransfersRaw.map((transfer) => {
      const date = toDateOnly(transfer.transferred_on);
      const outSeed = outfieldSeeds.find(
        (s) =>
          s.player_id === transfer.player_out_id &&
          s.released_at != null &&
          toDateOnly(s.released_at) === date,
      );
      const inSeed = outfieldSeeds.find(
        (s) =>
          s.player_id === transfer.player_in_id &&
          toDateOnly(s.acquired_at) === date,
      );
      const outStints: OwnershipStint[] = outSeed
        ? [
            {
              acquired_at: outSeed.acquired_at,
              released_at: outSeed.released_at,
            },
          ]
        : [];
      const inStints: OwnershipStint[] = inSeed
        ? [
            {
              acquired_at: inSeed.acquired_at,
              released_at: inSeed.released_at,
            },
          ]
        : [];
      const outGoals = countOutfieldGoalsInStints(
        teamEvents,
        team.id,
        transfer.player_out_id,
        outStints,
      );
      const inGoals = countOutfieldGoalsInStints(
        teamEvents,
        team.id,
        transfer.player_in_id,
        inStints,
      );
      const out_contribution = outfieldContribution(outGoals);
      const in_contribution = outfieldContribution(inGoals);
      return {
        ...transfer,
        out_contribution,
        in_contribution,
        net_contribution: in_contribution - out_contribution,
      };
    });

  const goalkeeperTransfers: FranchiseGoalkeeperTransfer[] =
    goalkeeperTransfersRaw.map((transfer) => {
      const date = toDateOnly(transfer.transferred_on);
      const outSeed = gkSeeds.find(
        (s) =>
          s.goalkeeper_club_id === transfer.club_out_id &&
          s.released_at != null &&
          toDateOnly(s.released_at) === date,
      );
      const inSeed = gkSeeds.find(
        (s) =>
          s.goalkeeper_club_id === transfer.club_in_id &&
          toDateOnly(s.acquired_at) === date,
      );
      const outStints: OwnershipStint[] = outSeed
        ? [
            {
              acquired_at: outSeed.acquired_at,
              released_at: outSeed.released_at,
            },
          ]
        : [];
      const inStints: OwnershipStint[] = inSeed
        ? [
            {
              acquired_at: inSeed.acquired_at,
              released_at: inSeed.released_at,
            },
          ]
        : [];
      const outConceded = countGoalkeeperConcessionsInStints(
        teamEvents,
        team.id,
        transfer.club_out_id,
        outStints,
      );
      const inConceded = countGoalkeeperConcessionsInStints(
        teamEvents,
        team.id,
        transfer.club_in_id,
        inStints,
      );
      const out_contribution = goalkeeperContribution(outConceded);
      const in_contribution = goalkeeperContribution(inConceded);
      return {
        ...transfer,
        out_contribution,
        in_contribution,
        net_contribution: in_contribution - out_contribution,
      };
    });

  const hasTransferIns =
    squadStints.some((s) =>
      isTransferIn(s.acquired_at, selectedSeason.starts_on),
    ) ||
    gkStints.some((s) =>
      isTransferIn(s.acquired_at, selectedSeason.starts_on),
    );
  const releasedCount =
    squadStints.filter((s) => s.released_at).length +
    gkStints.filter((s) => s.released_at).length;
  const dates_uncertain = !hasTransferIns && releasedCount > 0;

  const honourRows = (honoursRes.data ?? []) as Pick<
    Honour,
    "title" | "team_id" | "season_id"
  >[];
  const honourTitles = new Set(
    honourRows.map((h) => h.title.trim().toLowerCase()),
  );

  const snapshot: FranchiseHistorySnapshot = {
    franchise_id: selectedFranchise.id,
    season: {
      id: selectedSeason.id,
      name: selectedSeason.name,
      starts_on: selectedSeason.starts_on,
      ends_on: selectedSeason.ends_on,
      is_active: selectedSeason.is_active,
    },
    team: { id: team.id, name: team.name },
    managers,
    league_position: standing?.position ?? seasonTeams.length,
    league_points: standing?.points ?? 0,
    goals_for: standing?.goals_for ?? 0,
    goals_against: standing?.goals_against ?? 0,
    honours: {
      league_champions: honourTitles.has("league champions"),
      cup_winners: honourTitles.has("cup winners"),
      bfl_winners: honourTitles.has("bfl challenge winners"),
    },
    transfer_usage,
    end_squad: {
      goalkeeper,
      outfield: sortOutfieldSquad(outfield),
    },
    transfers: {
      outfield: outfieldTransfers,
      goalkeeper: goalkeeperTransfers,
      dates_uncertain,
    },
  };

  return {
    status: "ok",
    franchises,
    seasons: seasonOptions,
    selected_franchise_id: selectedFranchise.id,
    selected_season_id: selectedSeason.id,
    snapshot,
  };
}
