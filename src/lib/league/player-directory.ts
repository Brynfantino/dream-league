import { canonicalizeClubName } from "@/lib/league/club-aliases";
import type { PlayerPosition } from "@/types/database";

export type PlayerDirectoryRow = {
  player_id: string;
  name: string;
  position: PlayerPosition;
  club: string | null;
  team_id: string | null;
  team_name: string | null;
  /** ISO timestamptz from active squad_memberships.acquired_at */
  acquired_at: string | null;
  /** Season outfield_goal count from goal_events */
  goals: number;
};

export type PlayerDirectoryFilters = {
  position: PlayerPosition | null;
  club: string | null;
  team_id: string | null;
  /** Minimum goals (inclusive). Null = no filter. */
  min_goals: number | null;
};

export type PlayerDirectorySort = "name" | "goals";

export const POSITION_LABEL: Record<PlayerPosition, string> = {
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

/**
 * Filter and sort directory rows (PRD §13 Player Directory).
 * Sort: Alphabetical (name) or Goals Scored (desc, then name).
 */
export function applyPlayerDirectoryView(
  rows: PlayerDirectoryRow[],
  filters: PlayerDirectoryFilters,
  sort: PlayerDirectorySort,
): PlayerDirectoryRow[] {
  let next = rows;

  if (filters.position) {
    next = next.filter((row) => row.position === filters.position);
  }
  if (filters.club) {
    const club = canonicalizeClubName(filters.club)?.toLowerCase() ?? "";
    next = next.filter(
      (row) =>
        (canonicalizeClubName(row.club) ?? "").toLowerCase() === club,
    );
  }
  if (filters.team_id) {
    next = next.filter((row) => row.team_id === filters.team_id);
  }
  if (filters.min_goals !== null && filters.min_goals > 0) {
    next = next.filter((row) => row.goals >= filters.min_goals!);
  }

  return [...next].sort((a, b) => {
    if (sort === "goals") {
      if (b.goals !== a.goals) return b.goals - a.goals;
      return a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  });
}

export function parsePlayerDirectorySearchParams(params: {
  position?: string | string[];
  club?: string | string[];
  team?: string | string[];
  goals?: string | string[];
  sort?: string | string[];
}): { filters: PlayerDirectoryFilters; sort: PlayerDirectorySort } {
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const positionRaw = one(params.position);
  const position =
    positionRaw === "DEF" || positionRaw === "MID" || positionRaw === "FWD"
      ? positionRaw
      : null;

  const clubRaw = one(params.club)?.trim() || null;
  const team_id = one(params.team)?.trim() || null;

  const goalsRaw = one(params.goals);
  let min_goals: number | null = null;
  if (goalsRaw !== undefined && goalsRaw !== "") {
    const n = Number.parseInt(goalsRaw, 10);
    if (Number.isFinite(n) && n >= 0) min_goals = n;
  }

  const sortRaw = one(params.sort);
  const sort: PlayerDirectorySort = sortRaw === "goals" ? "goals" : "name";

  return {
    filters: { position, club: clubRaw, team_id, min_goals },
    sort,
  };
}
