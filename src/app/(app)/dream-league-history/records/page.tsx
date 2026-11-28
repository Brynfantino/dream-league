import { Suspense } from "react";

import { RecordsView } from "@/components/history/records-view";
import { loadRecords } from "@/lib/league/load-records";

export default function DreamLeagueRecordsPage() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="font-display text-2xl tracking-wide text-pitch-950 sm:text-3xl">
          Dream League Records
        </h2>
        <p className="text-sm text-pitch-800">
          The Dream League Record Book — standout achievements, extreme
          performances, and historical milestones across imported seasons.
        </p>
      </header>

      <Suspense
        fallback={<p className="text-sm text-pitch-700">Loading records…</p>}
      >
        <RecordsContent />
      </Suspense>
    </div>
  );
}

async function RecordsContent() {
  const result = await loadRecords();

  if (result.status === "unconfigured") {
    return (
      <p className="text-sm text-pitch-700">
        Supabase is not configured. Set{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        to load Dream League Records.
      </p>
    );
  }

  if (result.status === "error") {
    return (
      <p className="text-sm text-pitch-700">
        Could not load records: {result.message}
      </p>
    );
  }

  return <RecordsView data={result.data} />;
}
