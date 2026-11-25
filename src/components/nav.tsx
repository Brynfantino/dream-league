"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { UserRole } from "@/types/database";

const primaryLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/league-table", label: "League Table" },
  { href: "/teams", label: "Teams" },
  { href: "/players", label: "Players" },
  { href: "/transfers", label: "Transfers" },
  { href: "/cup", label: "Cup" },
  { href: "/account", label: "Account" },
] as const;

const commissionerLinks = [
  { href: "/commissioner/goal-updates", label: "Goal Updates" },
  { href: "/commissioner/transfers-approval", label: "Transfers Approval" },
  { href: "/commissioner/seasons", label: "Seasons" },
  { href: "/commissioner/auction-import", label: "Auction Import" },
  { href: "/commissioner/administration", label: "Administration" },
] as const;

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-pitch-800 text-white"
          : "text-pitch-100 hover:bg-pitch-800/60 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

export function AppNav({ role }: { role: UserRole | null }) {
  const showCommissioner = role === "commissioner";

  return (
    <header className="border-b border-pitch-700 bg-pitch-900 text-pitch-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="font-display text-xl tracking-wide">
            Dream League
          </Link>
          <div className="flex items-center gap-2 text-sm text-pitch-200">
            {role ? (
              <span className="capitalize">Signed in as {role}</span>
            ) : (
              <Link href="/login" className="underline-offset-2 hover:underline">
                Sign in
              </Link>
            )}
          </div>
        </div>
        <nav className="flex flex-wrap gap-1" aria-label="Primary">
          {primaryLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </nav>
        {showCommissioner ? (
          <nav
            className="flex flex-wrap gap-1 border-t border-pitch-700 pt-3"
            aria-label="Commissioner"
          >
            <span className="mr-2 self-center text-xs font-semibold uppercase tracking-wider text-pitch-300">
              Commissioner
            </span>
            {commissionerLinks.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
