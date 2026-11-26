import { Suspense } from "react";

import { TeamDetailView } from "@/components/team/team-detail-view";
import { TeamPicker } from "@/components/team/team-picker";
import { loadTeamPage } from "@/lib/league/load-team-page";

type TeamPageProps = {
  searchParams: Promise<{ team?: string | string[] }>;
};

export default function TeamPage({ searchParams }: TeamPageProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl tracking-wide text-pitch-950 sm:text-4xl">
          Team Page
        </h1>
        <p className="text-base text-pitch-800">
          Squad, standings summary, and scoring for the active season.
        </p>
      </header>

      <Suspense
        fallback={<p className="text-sm text-pitch-700">Loading team…</p>}
      >
        <TeamPageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TeamPageContent({
  searchParams,
}: {
  searchParams: Promise<{ team?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = params.team;
  const teamId = Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null);

  const result = await loadTeamPage(teamId);

  if (result.status === "unconfigured") {
    return (
      <p className="text-sm text-pitch-700">
        Supabase is not configured. Set{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        to load teams.
      </p>
    );
  }

  if (result.status === "no_active_season") {
    return (
      <p className="text-sm text-pitch-700">
        No active season found. Mark a season with{" "}
        <code className="font-mono text-xs">is_active</code> to show teams.
      </p>
    );
  }

  if (result.status === "error") {
    return (
      <p className="text-sm text-pitch-700">
        Could not load team page: {result.message}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <TeamPicker teams={result.teams} selectedId={teamId} />
        <p className="text-sm text-pitch-700">
          Active season: {result.season.name}
        </p>
      </div>

      {result.missing_team ? (
        <p className="text-sm text-pitch-700">
          That team is not in the active season. Choose a team above.
        </p>
      ) : null}

      {!result.detail && !result.missing_team ? (
        <p className="text-sm text-pitch-700">
          Select a team to view the squad and standings summary.
        </p>
      ) : null}

      {result.detail ? <TeamDetailView detail={result.detail} /> : null}
    </div>
  );
}
