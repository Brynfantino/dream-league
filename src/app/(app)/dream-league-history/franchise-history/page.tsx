import { Suspense } from "react";

import { FranchiseHistoryView } from "@/components/history/franchise-history-view";
import { loadFranchiseHistory } from "@/lib/league/load-franchise-history";

type PageProps = {
  searchParams: Promise<{ franchise?: string; season?: string }>;
};

export default function FranchiseHistoryPage({ searchParams }: PageProps) {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="font-display text-2xl tracking-wide text-pitch-950 sm:text-3xl">
          Franchise History
        </h2>
        <p className="text-sm text-pitch-800">
          A historical snapshot of any Dream League franchise in a chosen
          season — squad, transfers, finish, and honours. Read-only.
        </p>
      </header>

      <Suspense
        fallback={
          <p className="text-sm text-pitch-700">Loading franchise history…</p>
        }
      >
        <FranchiseHistoryContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function FranchiseHistoryContent({
  searchParams,
}: {
  searchParams: Promise<{ franchise?: string; season?: string }>;
}) {
  const params = await searchParams;
  const result = await loadFranchiseHistory(
    params.franchise ?? null,
    params.season ?? null,
  );

  if (result.status === "unconfigured") {
    return (
      <p className="text-sm text-pitch-700">
        Supabase is not configured. Set{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        to load Franchise History.
      </p>
    );
  }

  if (result.status === "no_data") {
    return (
      <p className="text-sm text-pitch-700">
        No franchise seasons found. Import historical seasons to browse
        campaigns.
      </p>
    );
  }

  if (result.status === "error") {
    return (
      <p className="text-sm text-pitch-700">
        Could not load franchise history: {result.message}
      </p>
    );
  }

  return (
    <FranchiseHistoryView
      franchises={result.franchises}
      seasons={result.seasons}
      selectedFranchiseId={result.selected_franchise_id}
      selectedSeasonId={result.selected_season_id}
      snapshot={result.snapshot}
    />
  );
}
