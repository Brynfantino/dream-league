import Link from "next/link";

import { historyNav } from "@/config/navigation";

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
            {item.label === "Trophy Room"
              ? "League and Cup cabinet — current holders and previous winners."
              : "Career Goals For, Goals Against, and League Points by franchise."}
          </p>
        </Link>
      ))}
    </div>
  );
}
