import type { TrophyCabinet, TrophyHonourRow } from "@/lib/league/load-trophy-room";

function displaySeason(row: TrophyHonourRow): string {
  if (row.season_label) return row.season_label;
  if (row.season_name) return row.season_name;
  return "—";
}

function TrophySilhouette({ kind }: { kind: "league" | "cup" }) {
  if (kind === "cup") {
    return (
      <svg
        viewBox="0 0 80 100"
        className="trophy-shine h-28 w-[5.5rem] drop-shadow-md sm:h-36 sm:w-28"
        aria-hidden
      >
        <defs>
          <linearGradient id="cupMetal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f6e27a" />
            <stop offset="45%" stopColor="#d4a017" />
            <stop offset="100%" stopColor="#8a5a00" />
          </linearGradient>
        </defs>
        <path
          fill="url(#cupMetal)"
          d="M20 18h40v8c0 14-8 26-20 32-12-6-20-18-20-32V18z"
        />
        <path
          fill="url(#cupMetal)"
          d="M16 22c-8 2-12 10-8 18 3 6 9 8 14 6"
          opacity="0.9"
        />
        <path
          fill="url(#cupMetal)"
          d="M64 22c8 2 12 10 8 18-3 6-9 8-14 6"
          opacity="0.9"
        />
        <rect x="34" y="56" width="12" height="16" rx="2" fill="url(#cupMetal)" />
        <rect x="24" y="72" width="32" height="8" rx="2" fill="url(#cupMetal)" />
        <rect x="20" y="80" width="40" height="10" rx="3" fill="url(#cupMetal)" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 80 100"
      className="trophy-shine h-28 w-[5.5rem] drop-shadow-md sm:h-36 sm:w-28"
      aria-hidden
    >
      <defs>
        <linearGradient id="leagueMetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe9a0" />
          <stop offset="40%" stopColor="#e0b43a" />
          <stop offset="100%" stopColor="#7a5208" />
        </linearGradient>
      </defs>
      <polygon
        fill="url(#leagueMetal)"
        points="40,8 48,30 72,30 52,46 60,70 40,54 20,70 28,46 8,30 32,30"
      />
      <rect x="34" y="68" width="12" height="12" rx="1" fill="url(#leagueMetal)" />
      <rect x="22" y="80" width="36" height="10" rx="3" fill="url(#leagueMetal)" />
    </svg>
  );
}

function CabinetColumn({ cabinet }: { cabinet: TrophyCabinet }) {
  const kind = cabinet.title === "League Champions" ? "league" : "cup";

  return (
    <section
      className="cabinet-panel relative flex flex-col overflow-hidden rounded-sm border border-[#5c3d22]/80 bg-gradient-to-b from-[#3a2616] via-[#2a1a10] to-[#1a100a] shadow-[inset_0_1px_0_rgba(255,220,160,0.15),0_12px_28px_rgba(0,0,0,0.35)]"
      aria-labelledby={`trophy-${kind}-heading`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_40%,rgba(255,236,180,0.08)_50%,transparent_60%)] opacity-80"
        aria-hidden
      />

      <header className="relative border-b border-[#6b4528] px-5 py-4 text-center">
        <p className="text-[0.7rem] uppercase tracking-[0.25em] text-[#d4b483]">
          Dream League
        </p>
        <h2
          id={`trophy-${kind}-heading`}
          className="font-display text-3xl tracking-wide text-[#f3e2c0] sm:text-4xl"
        >
          {cabinet.shortLabel} Trophy
        </h2>
      </header>

      <div className="relative flex flex-1 flex-col items-center gap-4 px-5 py-8">
        <div className="cabinet-shelf flex w-full flex-col items-center gap-3 rounded-sm border border-[#7a5230]/50 bg-[#24160e]/80 px-4 py-6">
          <TrophySilhouette kind={kind} />
          {cabinet.current ? (
            <div className="text-center">
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-[#c9a66b]">
                Current holders
              </p>
              <p className="mt-1 font-display text-2xl tracking-wide text-[#fff4d8] sm:text-3xl">
                {cabinet.current.team_name}
              </p>
              <p className="mt-1 text-sm text-[#e0c896]">
                {displaySeason(cabinet.current)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#b89a6a]">No holders recorded yet.</p>
          )}
        </div>

        <div className="w-full">
          <h3 className="mb-2 text-center text-[0.65rem] uppercase tracking-[0.2em] text-[#c9a66b]">
            Previous winners
          </h3>
          {cabinet.previous.length === 0 ? (
            <p className="text-center text-sm text-[#9a7a4f]">
              No earlier winners yet.
            </p>
          ) : (
            <ul className="divide-y divide-[#5c3d22]/70 border border-[#5c3d22]/70 bg-[#1c120c]/70">
              {cabinet.previous.map((row) => (
                <li
                  key={row.id}
                  className="flex items-baseline justify-between gap-3 px-3 py-2.5 text-sm"
                >
                  <span className="font-medium text-[#f0e0c0]">
                    {row.team_name}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-[#c9a66b]">
                    {displaySeason(row)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export function TrophyRoomView({ cabinets }: { cabinets: TrophyCabinet[] }) {
  return (
    <div className="space-y-6">
      <div
        className="rounded-sm border border-[#6b4528] bg-[radial-gradient(ellipse_at_top,#4a3020_0%,#1a100a_70%)] p-3 shadow-[0_16px_40px_rgba(20,10,0,0.35)] sm:p-5"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(90,55,30,0.35) 1px, transparent 1px), linear-gradient(rgba(90,55,30,0.25) 1px, transparent 1px), radial-gradient(ellipse at top, #4a3020 0%, #1a100a 70%)",
          backgroundSize: "48px 48px, 48px 48px, auto",
        }}
      >
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
          {cabinets.map((cabinet) => (
            <CabinetColumn key={cabinet.title} cabinet={cabinet} />
          ))}
        </div>
      </div>
    </div>
  );
}
