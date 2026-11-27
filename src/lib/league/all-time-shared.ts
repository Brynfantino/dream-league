/**
 * Client-safe types and helpers for the all-time table.
 * Keep this module free of next/server and Supabase server clients so
 * `"use client"` components can import it without pulling next/headers.
 */

export type AllTimeTableRow = {
  franchise_id: string;
  /** Latest-season team name for this franchise (Bryn). */
  display_name: string;
  goals_for: number;
  goals_against: number;
  points: number;
  /** League points ÷ seasons played, rounded up (0 if no seasons). */
  avg_points_per_season: number;
  position: number;
  /** League Champions titles across all seasons (franchise-collapsed). */
  league_titles: number;
  /** Cup Winners titles across all seasons (franchise-collapsed). */
  cup_titles: number;
  /** Seasons this franchise appeared in (labels / names), newest first. */
  seasons_played: string[];
  /** True when franchise has a team in the latest season by starts_on. */
  is_active_franchise: boolean;
};

/** Compact honour summary for the all-time table column. */
export function formatHonoursSummary(
  leagueTitles: number,
  cupTitles: number,
): string {
  if (leagueTitles === 0 && cupTitles === 0) return "—";
  const parts: string[] = [];
  if (leagueTitles > 0) {
    parts.push(`${leagueTitles} League${leagueTitles === 1 ? "" : "s"}`);
  }
  if (cupTitles > 0) {
    parts.push(`${cupTitles} Cup${cupTitles === 1 ? "" : "s"}`);
  }
  return parts.join(", ");
}
