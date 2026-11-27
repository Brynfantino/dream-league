import Link from "next/link";
import { Suspense } from "react";

import { PlayerProfileView } from "@/components/player/player-profile-view";
import { loadPlayerPage } from "@/lib/league/load-player-page";

type PlayerPageProps = {
  searchParams: Promise<{ player?: string | string[] }>;
};

export default function PlayerPage({ searchParams }: PlayerPageProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-pitch-700">
          <Link
            href="/player-directory"
            className="underline-offset-4 hover:underline"
          >
            ← Player Directory
          </Link>
        </p>
        <h1 className="font-display text-3xl tracking-wide text-pitch-950 sm:text-4xl">
          Player Profile
        </h1>
        <p className="text-base text-pitch-800">
          Ownership history and Dream League career by real-life club.
        </p>
      </header>

      <Suspense
        fallback={<p className="text-sm text-pitch-700">Loading player…</p>}
      >
        <PlayerPageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function PlayerPageContent({
  searchParams,
}: {
  searchParams: Promise<{ player?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = params.player;
  const playerId = Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null);

  const result = await loadPlayerPage(playerId);

  if (result.status === "unconfigured") {
    return (
      <p className="text-sm text-pitch-700">
        Supabase is not configured. Set{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        to load player profiles.
      </p>
    );
  }

  if (result.status === "error") {
    return (
      <p className="text-sm text-pitch-700">
        Could not load player profile: {result.message}
      </p>
    );
  }

  if (result.status === "not_found") {
    return (
      <p className="text-sm text-pitch-700">
        Player not found. Open a profile from the{" "}
        <Link
          href="/player-directory"
          className="underline-offset-4 hover:underline"
        >
          Player Directory
        </Link>
        .
      </p>
    );
  }

  return <PlayerProfileView detail={result.detail} />;
}
