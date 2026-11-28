import { Suspense } from "react";

import { InsightsView } from "@/components/history/insights-view";
import { loadInsights } from "@/lib/league/load-insights";

export default function InsightsTabPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-pitch-700">Loading insights…</p>}
    >
      <InsightsContent />
    </Suspense>
  );
}

async function InsightsContent() {
  const result = await loadInsights();

  if (result.status === "unconfigured") {
    return (
      <p className="text-sm text-pitch-700">
        Supabase is not configured. Set{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        to load insights.
      </p>
    );
  }

  if (result.status === "error") {
    return (
      <p className="text-sm text-pitch-700">
        Could not load insights: {result.message}
      </p>
    );
  }

  return <InsightsView data={result.data} />;
}
