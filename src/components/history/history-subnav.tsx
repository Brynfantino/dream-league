"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { historyNav } from "@/config/navigation";

export function HistorySubnav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dream League History sections"
      className="flex flex-wrap gap-2 border-b border-pitch-300 pb-3"
    >
      {historyNav.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-pitch-800 text-white"
                : "bg-pitch-100 text-pitch-900 hover:bg-pitch-200"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
