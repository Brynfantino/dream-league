import { Suspense } from "react";

import { PlayerDirectoryFilters } from "@/components/player/player-directory-filters";
import { PlayerDirectoryTable } from "@/components/player/player-directory-table";
import { loadPlayerDirectory } from "@/lib/league/load-player-directory";
import {
  applyPlayerDirectoryView,
  parsePlayerDirectorySearchParams,
} from "@/lib/league/player-directory";

type PlayerDirectoryPageProps = {
  searchParams: Promise<{
    position?: string | string[];
    club?: string | string[];
    team?: string | string[];
    goals?: string | string[];
    sort?: string | string[];
  }>;
};

export default function PlayerDirectoryPage({
  searchParams,
}: PlayerDirectoryPageProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl tracking-wide text-pitch-950 sm:text-4xl">
          Player Directory
        </h1>
        <p className="text-base text-pitch-800">
          Outfield players for the active season — Player Name, Position,
          Current Team, Goals, Club, Acquisition Date. Goals from goal events;
          ownership from current squad memberships (PRD §13).
        </p>
      </header>

      <Suspense
        fallback={
          <p className="text-sm text-pitch-700">Loading player directory…</p>
        }
      >
        <PlayerDirectoryContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function PlayerDirectoryContent({
  searchParams,
}: {
  searchParams: PlayerDirectoryPageProps["searchParams"];
}) {
  const params = await searchParams;
  const { filters, sort } = parsePlayerDirectorySearchParams(params);
  const result = await loadPlayerDirectory();

  if (result.status === "unconfigured") {
    return (
      <p className="text-sm text-pitch-700">
        Supabase is not configured. Set{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        to load the directory.
      </p>
    );
  }

  if (result.status === "no_active_season") {
    return (
      <p className="text-sm text-pitch-700">
        No active season found. Mark a season with{" "}
        <code className="font-mono text-xs">is_active</code> to show players.
      </p>
    );
  }

  if (result.status === "error") {
    return (
      <p className="text-sm text-pitch-700">
        Could not load player directory: {result.message}
      </p>
    );
  }

  const rows = applyPlayerDirectoryView(result.rows, filters, sort);

  return (
    <div className="space-y-6">
      <p className="text-sm text-pitch-700">
        Active season: {result.season.name} · {rows.length} player
        {rows.length === 1 ? "" : "s"}
      </p>

      <Suspense fallback={null}>
        <PlayerDirectoryFilters clubs={result.clubs} teams={result.teams} />
      </Suspense>

      <PlayerDirectoryTable rows={rows} />
    </div>
  );
}
