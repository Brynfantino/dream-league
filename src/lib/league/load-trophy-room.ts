import { connection } from "next/server";

import {
  linkTeamIdForName,
  mapActiveTeamIdsByFranchise,
} from "@/lib/league/team-links";
import { createClient } from "@/lib/supabase/server";
import type { Honour, Season, Team } from "@/types/database";

export type HonourTitle = "League Champions" | "Cup Winners";

export type TrophyHonourRow = {
  id: string;
  title: HonourTitle;
  season_label: string | null;
  season_name: string | null;
  season_starts_on: string | null;
  team_id: string | null;
  team_name: string;
  /** Active-season team id for Team Page; null if franchise not in active season. */
  link_team_id: string | null;
};

export type TrophyCabinet = {
  title: HonourTitle;
  shortLabel: string;
  current: TrophyHonourRow | null;
  previous: TrophyHonourRow[];
};

export type TrophyRoomResult =
  | { status: "ok"; cabinets: TrophyCabinet[] }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

const TITLES: HonourTitle[] = ["League Champions", "Cup Winners"];

/**
 * Load League + Cup honours across all seasons (read-only Trophy Room).
 * BFL Challenge Winners intentionally excluded (Bryn scope).
 */
export async function loadTrophyRoom(): Promise<TrophyRoomResult> {
  await connection();

  const supabase = await createClient();
  if (!supabase) {
    return { status: "unconfigured" };
  }

  const { data: honours, error: honoursError } = await supabase
    .from("honours")
    .select("id, title, season_label, season_id, team_id")
    .in("title", TITLES);

  if (honoursError) {
    return { status: "error", message: honoursError.message };
  }

  const honourRows = (honours ?? []) as Pick<
    Honour,
    "id" | "title" | "season_label" | "season_id" | "team_id"
  >[];

  const seasonIds = [
    ...new Set(
      honourRows
        .map((h) => h.season_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const teamIds = [
    ...new Set(
      honourRows
        .map((h) => h.team_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const seasonsById = new Map<
    string,
    Pick<Season, "id" | "name" | "starts_on">
  >();
  if (seasonIds.length) {
    const { data: seasons, error: seasonsError } = await supabase
      .from("seasons")
      .select("id, name, starts_on")
      .in("id", seasonIds);
    if (seasonsError) {
      return { status: "error", message: seasonsError.message };
    }
    for (const s of (seasons ?? []) as Pick<
      Season,
      "id" | "name" | "starts_on"
    >[]) {
      seasonsById.set(s.id, s);
    }
  }

  const teamsById = new Map<string, string>();
  if (teamIds.length) {
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", teamIds);
    if (teamsError) {
      return { status: "error", message: teamsError.message };
    }
    for (const t of (teams ?? []) as Pick<Team, "id" | "name">[]) {
      teamsById.set(t.id, t.name);
    }
  }

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

  const rows: TrophyHonourRow[] = honourRows.map((h) => {
    const season = h.season_id ? seasonsById.get(h.season_id) : undefined;
    const team_name =
      (h.team_id && teamsById.get(h.team_id)) || "Unknown team";
    return {
      id: h.id,
      title: h.title as HonourTitle,
      season_label: h.season_label,
      season_name: season?.name ?? null,
      season_starts_on: season?.starts_on ?? null,
      team_id: h.team_id,
      team_name,
      link_team_id: linkTeamIdForName(team_name, activeByFranchise),
    };
  });

  const cabinets: TrophyCabinet[] = TITLES.map((title) => {
    const forTitle = rows
      .filter((r) => r.title === title)
      .sort((a, b) => {
        const da = a.season_starts_on ?? "";
        const db = b.season_starts_on ?? "";
        if (da !== db) return db.localeCompare(da);
        return (b.season_label ?? "").localeCompare(a.season_label ?? "");
      });

    const [current, ...previous] = forTitle;
    return {
      title,
      shortLabel: title === "League Champions" ? "League" : "Cup",
      current: current ?? null,
      previous,
    };
  });

  return { status: "ok", cabinets };
}
