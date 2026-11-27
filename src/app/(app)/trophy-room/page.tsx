import { Suspense } from "react";

import { TrophyRoomView } from "@/components/trophy/trophy-room-view";
import { loadTrophyRoom } from "@/lib/league/load-trophy-room";

export default function TrophyRoomPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl tracking-wide text-pitch-950 sm:text-4xl">
          Trophy Room
        </h1>
        <p className="text-base text-pitch-800">
          League and Cup trophy cabinet — current holders and previous winners
          across Dream League history. Read-only.
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
      </p>
    );
  }

  return <TrophyRoomView cabinets={result.cabinets} />;
}
