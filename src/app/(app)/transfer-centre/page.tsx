import { Suspense } from "react";

import { TransferCentreView } from "@/components/transfer/transfer-centre-view";
import { loadTransferCentre } from "@/lib/league/load-transfer-centre";

export default function TransferCentrePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl tracking-wide text-pitch-950 sm:text-4xl">
          Transfer Centre
        </h1>
        <p className="text-base text-pitch-800">
          Active-season transfer activity and usage by team. Read-only —
          derived from ownership history (not transfer actions).
        </p>
      </header>

      <Suspense
        fallback={
          <p className="text-sm text-pitch-700">Loading transfer centre…</p>
        }
      >
        <TransferCentreContent />
      </Suspense>
    </div>
  );
}

async function TransferCentreContent() {
  const result = await loadTransferCentre();

  if (result.status === "unconfigured") {
    return (
      <p className="text-sm text-pitch-700">
        Supabase is not configured. Set{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        to load transfers.
      </p>
    );
  }

  if (result.status === "no_active_season") {
    return (
      <p className="text-sm text-pitch-700">
        No active season found. Mark a season with{" "}
        <code className="font-mono text-xs">is_active</code> to show transfers.
      </p>
    );
  }

  if (result.status === "error") {
    return (
      <p className="text-sm text-pitch-700">
        Could not load transfer centre: {result.message}
      </p>
    );
  }

  return (
    <TransferCentreView
      seasonName={result.season.name}
      outfieldTransfers={result.outfield_transfers}
      goalkeeperTransfers={result.goalkeeper_transfers}
      teamCounts={result.team_counts}
    />
  );
}
