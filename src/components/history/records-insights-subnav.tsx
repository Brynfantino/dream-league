"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dream-league-history/records", label: "Records", exact: true },
  {
    href: "/dream-league-history/records/insights",
    label: "Insights",
    exact: false,
  },
] as const;

export function RecordsInsightsSubnav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Records and Insights"
      className="flex flex-wrap gap-2 border-b border-pitch-200 pb-3"
    >
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-pitch-800 text-white"
                : "bg-pitch-100 text-pitch-900 hover:bg-pitch-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
