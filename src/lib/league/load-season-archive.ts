import { connection } from "next/server";

import { deriveStandings } from "@/lib/league/standings";
import {
  linkTeamIdForName,
  mapActiveTeamIdsByFranchise,
} from "@/lib/league/team-links";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { createClient } from "@/lib/supabase/server";
import type {
  GoalEvent,
  Season,
  Team,
  TeamManager,
} from "@/types/database";

export type SeasonArchiveOption = {
  id: string;
  name: string;
  starts_on: string | null;
  is_active: boolean;
};

export type SeasonArchiveRow = {
  position: number;
  team_id: string;
  team_name: string;
  /** Active-season team id for Team Page deep link. */
  link_team_id: string | null;
  /** Joined manager display names, or null when none recorded. */
  manager_label: string | null;
  goals_for: number;
  goals_against: number;
  points: number;
};

export type SeasonArchiveSummary = {
  season_name: string;
  champion: string | null;
  champion_team_id: string | null;
  runner_up: string | null;
  runner_up_team_id: string | null;
};

export type SeasonArchiveResult =
  | {
      status: "ok";
      seasons: SeasonArchiveOption[];
      selected: SeasonArchiveOption;
      summary: SeasonArchiveSummary;
      rows: SeasonArchiveRow[];
    }
  | { status: "unconfigured" }
  | { status: "no_seasons" }
  | { status: "error"; message: string };

type SeasonRow = Pick<Season, "id" | "name" | "starts_on" | "is_active">;
type TeamRow = Pick<Team, "id" | "name" | "season_id">;
type EventRow = Pick<GoalEvent, "team_id" | "event_type">;
type ManagerRow = Pick<TeamManager, "team_id" | "display_name">;

/**
 * Pick the most recent completed season (not is_active), else the latest by
 * starts_on. Used when no ?season= query is provided.
 */
export function pickDefaultSeasonId(seasons: SeasonArchiveOption[]): string | null {
  if (seasons.length === 0) return null;
  const completed = seasons.filter((s) => !s.is_active);
  const pool = completed.length > 0 ? completed : seasons;
  return pool[0]?.id ?? null;
}

/**
 * Load final league standings for one historical (or active) season.
 * Standings are derived from goal_events only — same SoT as League Table.
 */
export async function loadSeasonArchive(
  seasonId?: string | null,
): Promise<SeasonArchiveResult> {
  await connection();

  const supabase = await createClient();
  if (!supabase) {
    return { status: "unconfigured" };
  }

  const { data: seasonsRaw, error: seasonsError } = await supabase
    .from("seasons")
    .select("id, name, starts_on, is_active")
    .order("starts_on", { ascending: false });

  if (seasonsError) {
    return { status: "error", message: seasonsError.message };
  }

  const seasons = ((seasonsRaw ?? []) as SeasonRow[]).map((s) => ({
    id: s.id,
    name: s.name,
    starts_on: s.starts_on,
    is_active: s.is_active,
  }));

  if (seasons.length === 0) {
    return { status: "no_seasons" };
  }

  const requested =
    seasonId && seasons.some((s) => s.id === seasonId) ? seasonId : null;
  const selectedId = requested ?? pickDefaultSeasonId(seasons);
  const selected = seasons.find((s) => s.id === selectedId) ?? seasons[0]!;

  const { data: teamsRaw, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, season_id")
    .eq("season_id", selected.id);

  if (teamsError) {
    return { status: "error", message: teamsError.message };
  }

  const teams = (teamsRaw ?? []) as TeamRow[];
  const teamIds = teams.map((t) => t.id);

  const { data: eventsRaw, error: eventsError } = await fetchAllRows<EventRow>(
    (from, to) =>
      supabase
        .from("goal_events")
        .select("team_id, event_type")
        .eq("season_id", selected.id)
        .range(from, to),
  );

  if (eventsError) {
    return { status: "error", message: eventsError.message };
  }

  const managersByTeam = new Map<string, string[]>();
  if (teamIds.length > 0) {
    const { data: managersRaw, error: managersError } = await supabase
      .from("team_managers")
      .select("team_id, display_name")
      .in("team_id", teamIds)
      .order("display_name");

    if (managersError) {
      return { status: "error", message: managersError.message };
    }

    for (const m of (managersRaw ?? []) as ManagerRow[]) {
      const list = managersByTeam.get(m.team_id) ?? [];
      list.push(m.display_name);
      managersByTeam.set(m.team_id, list);
    }
  }

  const standings = deriveStandings(
    teams.map((t) => ({ id: t.id, name: t.name })),
    eventsRaw ?? [],
  );

  const { data: activeSeason, error: activeSeasonError } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (activeSeasonError) {
    return { status: "error", message: activeSeasonError.message };
  }

  let activeByFranchise = new Map<string, string>();
  if (activeSeason) {
    const active = activeSeason as Pick<Season, "id">;
    // Selected season may already be active — reuse its teams when possible.
    if (active.id === selected.id) {
      activeByFranchise = mapActiveTeamIdsByFranchise(
        teams.map((t) => ({ id: t.id, name: t.name })),
      );
    } else {
      const { data: activeTeams, error: activeTeamsError } = await supabase
        .from("teams")
        .select("id, name")
        .eq("season_id", active.id);
      if (activeTeamsError) {
        return { status: "error", message: activeTeamsError.message };
      }
      activeByFranchise = mapActiveTeamIdsByFranchise(
        (activeTeams ?? []) as Pick<Team, "id" | "name">[],
      );
    }
  }

  const rows: SeasonArchiveRow[] = standings.map((row) => {
    const managers = managersByTeam.get(row.team_id) ?? [];
    return {
      position: row.position,
      team_id: row.team_id,
      team_name: row.team_name,
      link_team_id: linkTeamIdForName(row.team_name, activeByFranchise),
      manager_label: managers.length > 0 ? managers.join(" · ") : null,
      goals_for: row.goals_for,
      goals_against: row.goals_against,
      points: row.points,
    };
  });

  const first = rows.find((r) => r.position === 1) ?? rows[0] ?? null;
  const runner =
    rows.find((r) => r.position === 2) ??
    (rows.length > 1 ? rows[1]! : null);

  return {
    status: "ok",
    seasons,
    selected,
    summary: {
      season_name: selected.name,
      champion: first?.team_name ?? null,
      champion_team_id: first?.link_team_id ?? null,
      runner_up: runner?.team_name ?? null,
      runner_up_team_id: runner?.link_team_id ?? null,
    },
    rows,
  };
}
