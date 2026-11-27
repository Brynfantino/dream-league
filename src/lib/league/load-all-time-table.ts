import { connection } from "next/server";

import type { AllTimeTableRow } from "@/lib/league/all-time-shared";
import { resolveFranchiseId } from "@/lib/league/franchise-map";
import { mapActiveTeamIdsByFranchise } from "@/lib/league/team-links";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { createClient } from "@/lib/supabase/server";
import type {
  GoalEvent,
  GoalEventType,
  Honour,
  Season,
  Team,
} from "@/types/database";

export type { AllTimeTableRow } from "@/lib/league/all-time-shared";
export { formatHonoursSummary } from "@/lib/league/all-time-shared";

export type AllTimeTableResult =
  | {
      status: "ok";
      rows: AllTimeTableRow[];
      latest_season_name: string | null;
      season_count: number;
    }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

type TeamRow = Pick<Team, "id" | "name" | "season_id">;
type SeasonRow = Pick<Season, "id" | "name" | "starts_on" | "is_active">;
type EventRow = Pick<GoalEvent, "team_id" | "event_type" | "season_id">;
type HonourRow = Pick<Honour, "title" | "team_id">;

const LEAGUE_TITLE = "League Champions";
const CUP_TITLE = "Cup Winners";

/**
 * All-time standings: sum GF/GA (hence points) across every season, collapsed
 * by Bryn-confirmed franchise name continuity. Read-only.
 *
 * Important: goal_events span many thousands of rows — must page past the
 * PostgREST 1000-row default or totals undercount (seen as tiny GA vs real GF).
 */
export async function loadAllTimeTable(): Promise<AllTimeTableResult> {
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

  const seasons = (seasonsRaw ?? []) as SeasonRow[];
  if (seasons.length === 0) {
    return {
      status: "ok",
      rows: [],
      latest_season_name: null,
      season_count: 0,
    };
  }

  const latestSeason = seasons[0]!;
  const seasonsById = new Map(seasons.map((s) => [s.id, s]));

  const { data: teamsRaw, error: teamsError } = await fetchAllRows<TeamRow>(
    (from, to) =>
      supabase.from("teams").select("id, name, season_id").range(from, to),
  );

  if (teamsError) {
    return { status: "error", message: teamsError.message };
  }

  const teams = teamsRaw ?? [];

  const { data: eventsRaw, error: eventsError } = await fetchAllRows<EventRow>(
    (from, to) =>
      supabase
        .from("goal_events")
        .select("team_id, event_type, season_id")
        .range(from, to),
  );

  if (eventsError) {
    return { status: "error", message: eventsError.message };
  }

  const events = eventsRaw ?? [];

  const { data: honoursRaw, error: honoursError } = await supabase
    .from("honours")
    .select("title, team_id")
    .in("title", [LEAGUE_TITLE, CUP_TITLE]);

  if (honoursError) {
    return { status: "error", message: honoursError.message };
  }

  const honours = (honoursRaw ?? []) as HonourRow[];

  type Agg = {
    goals_for: number;
    goals_against: number;
    league_titles: number;
    cup_titles: number;
    /** season_id → team name used that season */
    seasonNames: Map<string, string>;
    /** best (latest) starts_on + name for display */
    latestStartsOn: string;
    displayName: string;
  };

  const byFranchise = new Map<string, Agg>();
  const teamToFranchise = new Map<string, string>();

  for (const team of teams) {
    const franchiseId = resolveFranchiseId(team.name);
    teamToFranchise.set(team.id, franchiseId);

    const season = seasonsById.get(team.season_id);
    const startsOn = season?.starts_on ?? "";
    const existing = byFranchise.get(franchiseId);

    if (!existing) {
      byFranchise.set(franchiseId, {
        goals_for: 0,
        goals_against: 0,
        league_titles: 0,
        cup_titles: 0,
        seasonNames: new Map([[team.season_id, team.name]]),
        latestStartsOn: startsOn,
        displayName: team.name,
      });
      continue;
    }

    existing.seasonNames.set(team.season_id, team.name);
    if (startsOn > existing.latestStartsOn) {
      existing.latestStartsOn = startsOn;
      existing.displayName = team.name;
    } else if (
      startsOn === existing.latestStartsOn &&
      team.name.localeCompare(existing.displayName) < 0
    ) {
      existing.displayName = team.name;
    }
  }

  for (const event of events) {
    const franchiseId = teamToFranchise.get(event.team_id);
    if (!franchiseId) continue;
    const agg = byFranchise.get(franchiseId);
    if (!agg) continue;

    if (event.event_type === ("outfield_goal" satisfies GoalEventType)) {
      agg.goals_for += 1;
    } else if (event.event_type === ("gk_conceded" satisfies GoalEventType)) {
      agg.goals_against += 1;
    }
  }

  for (const honour of honours) {
    if (!honour.team_id) continue;
    const franchiseId = teamToFranchise.get(honour.team_id);
    if (!franchiseId) continue;
    const agg = byFranchise.get(franchiseId);
    if (!agg) continue;

    if (honour.title === LEAGUE_TITLE) {
      agg.league_titles += 1;
    } else if (honour.title === CUP_TITLE) {
      agg.cup_titles += 1;
    }
  }

  const activeSeason =
    seasons.find((s) => s.is_active) ?? latestSeason;
  const activeTeams = teams.filter((t) => t.season_id === activeSeason.id);
  const activeTeamByFranchise = mapActiveTeamIdsByFranchise(activeTeams);

  const activeFranchiseIds = new Set<string>();
  for (const team of activeTeams) {
    activeFranchiseIds.add(resolveFranchiseId(team.name));
  }

  const ranked = [...byFranchise.entries()]
    .map(([franchise_id, agg]) => {
      const seasonEntries = [...agg.seasonNames.entries()]
        .map(([seasonId]) => {
          const s = seasonsById.get(seasonId);
          return {
            label: s?.name ?? seasonId,
            starts_on: s?.starts_on ?? "",
          };
        })
        .sort((a, b) => b.starts_on.localeCompare(a.starts_on));

      const points = agg.goals_for - agg.goals_against;
      const seasonsPlayed = seasonEntries.length;
      return {
        franchise_id,
        display_name: agg.displayName,
        link_team_id: activeTeamByFranchise.get(franchise_id) ?? null,
        goals_for: agg.goals_for,
        goals_against: agg.goals_against,
        points,
        avg_points_per_season:
          seasonsPlayed > 0 ? Math.ceil(points / seasonsPlayed) : 0,
        league_titles: agg.league_titles,
        cup_titles: agg.cup_titles,
        seasons_played: seasonEntries.map((s) => s.label),
        is_active_franchise: activeFranchiseIds.has(franchise_id),
      };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
      return a.display_name.localeCompare(b.display_name);
    });

  const rows: AllTimeTableRow[] = [];
  for (let i = 0; i < ranked.length; i++) {
    const row = ranked[i]!;
    const prev = rows[i - 1];
    const tied =
      prev !== undefined &&
      prev.points === row.points &&
      prev.goals_for === row.goals_for;

    rows.push({
      ...row,
      position: tied ? prev.position : i + 1,
    });
  }

  return {
    status: "ok",
    rows,
    latest_season_name: latestSeason.name,
    season_count: seasons.length,
  };
}
