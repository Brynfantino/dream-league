import { connection } from "next/server";

import { deriveStandings, type LeagueTableRow } from "@/lib/league/standings";
import { createClient } from "@/lib/supabase/server";
import type { GoalEvent, Season, Team } from "@/types/database";

export type LeagueTableResult =
  | {
      status: "ok";
      season: Pick<Season, "id" | "name">;
      rows: LeagueTableRow[];
    }
  | { status: "unconfigured" }
  | { status: "no_active_season" }
  | { status: "error"; message: string };

/**
 * Load active-season standings derived from goal_events (read-only).
 * Runs at request time so env / DB state are not baked into a static shell.
 */
export async function loadLeagueTable(): Promise<LeagueTableResult> {
  await connection();

  const supabase = await createClient();
  if (!supabase) {
    return { status: "unconfigured" };
  }

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .maybeSingle();

  if (seasonError) {
    return { status: "error", message: seasonError.message };
  }
  if (!season) {
    return { status: "no_active_season" };
  }

  const activeSeason = season as Pick<Season, "id" | "name">;

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name")
    .eq("season_id", activeSeason.id);

  if (teamsError) {
    return { status: "error", message: teamsError.message };
  }

  const { data: events, error: eventsError } = await supabase
    .from("goal_events")
    .select("team_id, event_type")
    .eq("season_id", activeSeason.id);

  if (eventsError) {
    return { status: "error", message: eventsError.message };
  }

  const rows = deriveStandings(
    (teams ?? []) as Pick<Team, "id" | "name">[],
    (events ?? []) as Pick<GoalEvent, "team_id" | "event_type">[],
  );

  return { status: "ok", season: activeSeason, rows };
}
