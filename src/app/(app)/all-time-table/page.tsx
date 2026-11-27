import { Suspense } from "react";

import { AllTimeTable } from "@/components/league/all-time-table";
import { loadAllTimeTable } from "@/lib/league/load-all-time-table";

export default function AllTimeTablePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl tracking-wide text-pitch-950 sm:text-4xl">
          All-Time Table
        </h1>
        <p className="text-base text-pitch-800">
          Career Goals For, Goals Against, and League Points for every
          franchise across all seasons. Name changes are combined into one
          franchise; display names use the latest season. Read-only.
        </p>
      </header>

      <Suspense
        fallback={
          <p className="text-sm text-pitch-700">Loading all-time table…</p>
        }
      >
        <AllTimeTableContent />
      </Suspense>
    </div>
  );
}

async function AllTimeTableContent() {
  const result = await loadAllTimeTable();

  if (result.status === "unconfigured") {
    return (
      <p className="text-sm text-pitch-700">
        Supabase is not configured. Set{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        to load the all-time table.
      </p>
    );
  }

  if (result.status === "error") {
    return (
      <p className="text-sm text-pitch-700">
        Could not load all-time table: {result.message}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-pitch-700">
        {result.season_count} season
        {result.season_count === 1 ? "" : "s"}
        {result.latest_season_name
          ? ` · latest ${result.latest_season_name}`
          : ""}
        . Former franchises are listed but marked inactive.
      </p>
      <AllTimeTable rows={result.rows} />
    </div>
  );
}
