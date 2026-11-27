import { Suspense } from "react";

import { TrophyRoomView } from "@/components/trophy/trophy-room-view";
import { loadTrophyRoom } from "@/lib/league/load-trophy-room";

export default function TrophyRoomPage() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="font-display text-2xl tracking-wide text-pitch-950 sm:text-3xl">
          Trophy Room
        </h2>
        <p className="text-sm text-pitch-800">
          League and Cup trophy cabinet — current holders and previous winners.
        </p>
      </header>

      <Suspense
        fallback={<p className="text-sm text-pitch-700">Loading trophies…</p>}
      >
        <TrophyRoomContent />
      </Suspense>
    </div>
  );
}

async function TrophyRoomContent() {
  const result = await loadTrophyRoom();

  if (result.status === "unconfigured") {
    return (
      <p className="text-sm text-pitch-700">
        Supabase is not configured. Set{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        to load the Trophy Room.
      </p>
    );
  }

  if (result.status === "error") {
    return (
      <p className="text-sm text-pitch-700">
        Could not load Trophy Room: {result.message}
        {result.message.toLowerCase().includes("permission denied") ? (
          <>
            {" "}
            Apply{" "}
            <code className="font-mono text-xs">
              20261125231200_public_read_grants.sql
            </code>{" "}
            in the Supabase SQL Editor (includes{" "}
            <code className="font-mono text-xs">GRANT SELECT</code> on{" "}
            <code className="font-mono text-xs">honours</code>).
          </>
        ) : null}
      </p>
    );
  }

  return <TrophyRoomView cabinets={result.cabinets} />;
}
