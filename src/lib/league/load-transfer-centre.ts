import { connection } from "next/server";

import {
  deriveGoalkeeperTransfers,
  deriveOutfieldTransfers,
  type DerivedGoalkeeperTransfer,
  type DerivedOutfieldTransfer,
  type GoalkeeperStintSeed,
  type OutfieldStintSeed,
} from "@/lib/league/derive-transfers";
import {
  deriveTransferUsage,
  type TransferUsage,
} from "@/lib/league/transfer-usage";
import { createClient } from "@/lib/supabase/server";
import type {
  GoalkeeperClub,
  Player,
  PlayerPosition,
  Season,
  Team,
} from "@/types/database";

export type TransferCentreTeamCount = {
  team_id: string;
  team_name: string;
  usage: TransferUsage;
};

export type TransferCentreResult =
  | { status: "unconfigured" }
  | { status: "no_active_season" }
  | { status: "error"; message: string }
  | {
      status: "ok";
      season: Pick<Season, "id" | "name" | "starts_on">;
      outfield_transfers: DerivedOutfieldTransfer[];
      goalkeeper_transfers: DerivedGoalkeeperTransfer[];
      team_counts: TransferCentreTeamCount[];
    };

/**
 * Load read-only Transfer Centre for the active season.
 * Activity and counts are derived from ownership memberships — not the
 * unseeded `transfers` proposal table.
 */
export async function loadTransferCentre(): Promise<TransferCentreResult> {
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

  const [teamsRes, squadRes, gkRes] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name")
      .eq("season_id", activeSeason.id)
      .order("name"),
    supabase
      .from("squad_memberships")
      .select(
        "team_id, player_id, acquired_at, released_at, players(id, name, club, position)",
      )
      .eq("season_id", activeSeason.id),
    supabase
      .from("goalkeeper_memberships")
      .select(
        "team_id, goalkeeper_club_id, acquired_at, released_at, goalkeeper_clubs(id, name)",
      )
      .eq("season_id", activeSeason.id),
  ]);

  if (teamsRes.error) {
    return { status: "error", message: teamsRes.error.message };
  }
  if (squadRes.error) {
    return { status: "error", message: squadRes.error.message };
  }
  if (gkRes.error) {
    return { status: "error", message: gkRes.error.message };
  }

  const teams = (teamsRes.data ?? []) as Pick<Team, "id" | "name">[];
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));

  type SquadRow = {
    team_id: string;
    player_id: string;
    acquired_at: string;
    released_at: string | null;
    players:
      | Pick<Player, "id" | "name" | "club" | "position">
      | Pick<Player, "id" | "name" | "club" | "position">[]
      | null;
  };

  type GkRow = {
    team_id: string;
    goalkeeper_club_id: string;
    acquired_at: string;
    released_at: string | null;
    goalkeeper_clubs:
      | Pick<GoalkeeperClub, "id" | "name">
      | Pick<GoalkeeperClub, "id" | "name">[]
      | null;
  };

  const outfieldStints: OutfieldStintSeed[] = [];
  for (const row of (squadRes.data ?? []) as SquadRow[]) {
    const player = Array.isArray(row.players) ? row.players[0] : row.players;
    if (!player) continue;
    outfieldStints.push({
      team_id: row.team_id,
      player_id: player.id,
      player_name: player.name,
      club: player.club,
      position: player.position as PlayerPosition,
      acquired_at: row.acquired_at,
      released_at: row.released_at,
    });
  }

  const gkStints: GoalkeeperStintSeed[] = [];
  for (const row of (gkRes.data ?? []) as GkRow[]) {
    const club = Array.isArray(row.goalkeeper_clubs)
      ? row.goalkeeper_clubs[0]
      : row.goalkeeper_clubs;
    if (!club) continue;
    gkStints.push({
      team_id: row.team_id,
      goalkeeper_club_id: club.id,
      club_name: club.name,
      acquired_at: row.acquired_at,
      released_at: row.released_at,
    });
  }

  const outfield_transfers = deriveOutfieldTransfers(
    outfieldStints,
    teamNameById,
    activeSeason.starts_on,
  );
  const goalkeeper_transfers = deriveGoalkeeperTransfers(
    gkStints,
    teamNameById,
    activeSeason.starts_on,
  );

  const team_counts: TransferCentreTeamCount[] = teams.map((team) => {
    const outAcquired = outfieldStints
      .filter((s) => s.team_id === team.id)
      .map((s) => s.acquired_at);
    const gkAcquired = gkStints
      .filter((s) => s.team_id === team.id)
      .map((s) => s.acquired_at);
    return {
      team_id: team.id,
      team_name: team.name,
      usage: deriveTransferUsage(
        outAcquired,
        gkAcquired,
        activeSeason.starts_on,
      ),
    };
  });

  return {
    status: "ok",
    season: activeSeason,
    outfield_transfers,
    goalkeeper_transfers,
    team_counts,
  };
}
