import { Suspense } from "react";

import { SeasonArchiveView } from "@/components/history/season-archive-view";
import { loadSeasonArchive } from "@/lib/league/load-season-archive";

type PageProps = {
  searchParams: Promise<{ season?: string }>;
};

export default function SeasonArchivePage({ searchParams }: PageProps) {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="font-display text-2xl tracking-wide text-pitch-950 sm:text-3xl">
          Season Archive
        </h2>
        <p className="text-sm text-pitch-800">
          Final league tables for previous Dream League seasons. Pick a season
          to see champions, runner-up, and full standings. Read-only.
        </p>
      </header>

      <Suspense
        fallback={
          <p className="text-sm text-pitch-700">Loading season archive…</p>
        }
      >
        <SeasonArchiveContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SeasonArchiveContent({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const params = await searchParams;
  const result = await loadSeasonArchive(params.season ?? null);

  if (result.status === "unconfigured") {
    return (
      <p className="text-sm text-pitch-700">
        Supabase is not configured. Set{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        to load the season archive.
      </p>
    );
  }

  if (result.status === "no_seasons") {
    return (
      <p className="text-sm text-pitch-700">
        No seasons found. Import historical seasons to browse final tables.
      </p>
    );
  }

  if (result.status === "error") {
    return (
      <p className="text-sm text-pitch-700">
        Could not load season archive: {result.message}
      </p>
    );
  }

  return (
    <SeasonArchiveView
      seasons={result.seasons}
      selectedId={result.selected.id}
      summary={result.summary}
      rows={result.rows}
    />
  );
}
