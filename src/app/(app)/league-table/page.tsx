import { Suspense } from "react";

import { LeagueTable } from "@/components/league/league-table";
import { loadLeagueTable } from "@/lib/league/load-league-table";

export default function LeagueTablePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl tracking-wide text-pitch-950 sm:text-4xl">
          League Table
        </h1>
        <p className="text-base text-pitch-800">
          Position, Team, Goals For, Goals Against, League Points. Standings
          from goal events only — League Points = Goals For − Goals Against
          (PRD §7–§8).
        </p>
      </header>

      <Suspense
        fallback={
          <p className="text-sm text-pitch-700">Loading standings…</p>
        }
      >
        <LeagueTableContent />
      </Suspense>
    </div>
  );
}

async function LeagueTableContent() {
  const result = await loadLeagueTable();

  if (result.status === "unconfigured") {
    return (
      <p className="text-sm text-pitch-700">
        Supabase is not configured. Set{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        to load the table.
      </p>
    );
  }

  if (result.status === "no_active_season") {
    return (
      <p className="text-sm text-pitch-700">
        No active season found. Mark a season with{" "}
        <code className="font-mono text-xs">is_active</code> to show standings.
      </p>
    );
  }

  if (result.status === "error") {
    return (
      <p className="text-sm text-pitch-700">
        Could not load league table: {result.message}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-pitch-700">
        Active season: {result.season.name}
      </p>
      <LeagueTable rows={result.rows} />
    </div>
  );
}
