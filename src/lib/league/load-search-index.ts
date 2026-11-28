import { connection } from "next/server";

import { canonicalizeClubName } from "@/lib/league/club-aliases";
import {
  FRANCHISES,
  resolveFranchiseId,
} from "@/lib/league/franchise-map";
import { playerPageHref } from "@/lib/league/player-links";
import type { SearchHit, SearchIndex } from "@/lib/league/search-shared";
import {
  mapActiveTeamIdsByFranchise,
  teamPageHref,
} from "@/lib/league/team-links";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { createClient } from "@/lib/supabase/server";
import type { Player, PlayerPosition, Season, Team } from "@/types/database";

export type SearchIndexResult =
  | { status: "ok"; index: SearchIndex }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

type PlayerRow = Pick<Player, "id" | "name" | "club" | "position">;
type TeamRow = Pick<Team, "id" | "name" | "season_id">;
type SeasonRow = Pick<Season, "id" | "is_active">;
type ManagerRow = {
  display_name: string;
  team_id: string;
  teams: Pick<Team, "id" | "name"> | Pick<Team, "id" | "name">[] | null;
};

const POSITION_LABEL: Record<PlayerPosition, string> = {
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function uniqueTerms(values: Iterable<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const term = raw.trim().toLowerCase().replace(/\s+/g, " ");
    if (!term || seen.has(term)) continue;
    seen.add(term);
    out.push(term);
  }
  return out;
}

/**
 * Compact global search index for TopNav type-ahead.
 * Players (name-merged), franchises (with historical aliases), managers → team links.
 */
export async function loadSearchIndex(): Promise<SearchIndexResult> {
  await connection();

  const supabase = await createClient();
  if (!supabase) {
    return { status: "unconfigured" };
  }

  const [playersRes, teamsRes, seasonsRes, managersRes] = await Promise.all([
    fetchAllRows<PlayerRow>((from, to) =>
      supabase
        .from("players")
        .select("id, name, club, position")
        .order("name")
        .range(from, to),
    ),
    fetchAllRows<TeamRow>((from, to) =>
      supabase
        .from("teams")
        .select("id, name, season_id")
        .order("name")
        .range(from, to),
    ),
    supabase.from("seasons").select("id, is_active"),
    fetchAllRows<ManagerRow>((from, to) =>
      supabase
        .from("team_managers")
        .select("display_name, team_id, teams(id, name)")
        .order("display_name")
        .range(from, to),
    ),
  ]);

  if (playersRes.error) {
    return { status: "error", message: playersRes.error.message };
  }
  if (teamsRes.error) {
    return { status: "error", message: teamsRes.error.message };
  }
  if (seasonsRes.error) {
    return { status: "error", message: seasonsRes.error.message };
  }
  if (managersRes.error) {
    return { status: "error", message: managersRes.error.message };
  }

  const seasons = (seasonsRes.data ?? []) as SeasonRow[];
  const activeSeason = seasons.find((s) => s.is_active) ?? null;
  const teams = teamsRes.data ?? [];
  const activeTeams = activeSeason
    ? teams.filter((t) => t.season_id === activeSeason.id)
    : [];
  const activeByFranchise = mapActiveTeamIdsByFranchise(activeTeams);
  const activeNameById = new Map(activeTeams.map((t) => [t.id, t.name]));

  const entries: SearchHit[] = [];

  // —— Players (exact name merge, same as Player Profile) ——
  const playersByName = new Map<string, PlayerRow>();
  for (const player of playersRes.data ?? []) {
    const existing = playersByName.get(player.name);
    if (!existing) {
      playersByName.set(player.name, player);
      continue;
    }
    // Prefer a row that still carries a club name for subtitle.
    if (!existing.club && player.club) {
      playersByName.set(player.name, player);
    }
  }

  for (const player of playersByName.values()) {
    const club = player.club ? canonicalizeClubName(player.club) : null;
    const position = player.position
      ? (POSITION_LABEL[player.position] ?? player.position)
      : null;
    const subtitleParts = [club, position].filter(Boolean);
    entries.push({
      kind: "player",
      id: `player:${player.name}`,
      label: player.name,
      subtitle: subtitleParts.length > 0 ? subtitleParts.join(" · ") : null,
      href: playerPageHref(player.id),
      terms: uniqueTerms([player.name]),
    });
  }

  // —— Teams / franchises ——
  const namesByFranchise = new Map<string, Set<string>>();
  for (const franchise of FRANCHISES) {
    namesByFranchise.set(franchise.id, new Set(franchise.aliases));
  }
  for (const team of teams) {
    const franchiseId = resolveFranchiseId(team.name);
    const set = namesByFranchise.get(franchiseId) ?? new Set<string>();
    set.add(team.name);
    namesByFranchise.set(franchiseId, set);
  }

  const franchiseCanonical = new Map(
    FRANCHISES.map((f) => [f.id, f.canonicalName]),
  );

  for (const [franchiseId, nameSet] of namesByFranchise) {
    const activeTeamId = activeByFranchise.get(franchiseId) ?? null;
    const label =
      (activeTeamId ? activeNameById.get(activeTeamId) : null) ??
      franchiseCanonical.get(franchiseId) ??
      [...nameSet][0] ??
      franchiseId;

    const aliasHint = [...nameSet].find(
      (name) => name.toUpperCase() !== label.toUpperCase(),
    );

    entries.push({
      kind: "team",
      id: `team:${franchiseId}`,
      label,
      subtitle: activeTeamId
        ? aliasHint
          ? `Also: ${aliasHint}`
          : null
        : "Former franchise",
      href: activeTeamId ? teamPageHref(activeTeamId) : null,
      terms: uniqueTerms(nameSet),
    });
  }

  // —— Managers → active franchise Team Page ——
  const managerSeen = new Set<string>();
  for (const row of managersRes.data ?? []) {
    const team = unwrapOne(row.teams);
    const name = row.display_name?.trim();
    if (!name || !team) continue;

    const franchiseId = resolveFranchiseId(team.name);
    const dedupeKey = `${name.toLowerCase()}|${franchiseId}`;
    if (managerSeen.has(dedupeKey)) continue;
    managerSeen.add(dedupeKey);

    const activeTeamId = activeByFranchise.get(franchiseId) ?? null;
    const teamLabel =
      (activeTeamId ? activeNameById.get(activeTeamId) : null) ?? team.name;

    entries.push({
      kind: "manager",
      id: `manager:${dedupeKey}`,
      label: name,
      subtitle: teamLabel,
      href: activeTeamId ? teamPageHref(activeTeamId) : null,
      terms: uniqueTerms([name]),
    });
  }

  entries.sort((a, b) => {
    if (a.kind !== b.kind) {
      const order = { team: 0, player: 1, manager: 2 } as const;
      return order[a.kind] - order[b.kind];
    }
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });

  return { status: "ok", index: { entries } };
}
