import Link from "next/link";

import { historyNav } from "@/config/navigation";

const HISTORY_BLURBS: Record<string, string> = {
  "Trophy Room":
    "League and Cup cabinet — current holders and previous winners.",
  "All-Time Table":
    "Career Goals For, Goals Against, and League Points by franchise.",
  "Season Archive":
    "Browse previous seasons and view each final league table.",
  "Dream League Records":
    "Hall of fame record book — career, season, transfer, and franchise milestones.",
  "Franchise History":
    "Look back at any franchise in a chosen season — squad, transfers, finish, and trophies.",
};

export default function DreamLeagueHistoryPage() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {historyNav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="block border border-pitch-300 bg-pitch-50/60 px-5 py-6 transition-colors hover:border-pitch-500 hover:bg-pitch-100/80"
        >
          <h2 className="font-display text-2xl tracking-wide text-pitch-950">
            {item.label}
          </h2>
          <p className="mt-2 text-sm text-pitch-700">
            {HISTORY_BLURBS[item.label] ?? "Explore Dream League history."}
          </p>
        </Link>
      ))}
    </div>
  );
}
