"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { commissionerNav, primaryNav } from "@/config/navigation";

function SideLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-pitch-800 text-white"
          : "text-pitch-100 hover:bg-pitch-800/50 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

type SideNavProps = {
  onNavigate?: () => void;
};

export function SideNav({ onNavigate }: SideNavProps) {
  return (
    <div className="flex h-full flex-col gap-6 px-3 py-4">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="px-3 font-display text-2xl tracking-wide text-white"
      >
        Dream League
      </Link>

      <nav aria-label="Primary" className="flex flex-col gap-0.5">
        {primaryNav.map((item) => (
          <SideLink key={item.href} {...item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="mt-auto border-t border-pitch-700 pt-4">
        <nav aria-label="Commissioner Console" className="flex flex-col gap-0.5">
          {commissionerNav.map((item) => (
            <SideLink key={item.href} {...item} onNavigate={onNavigate} />
          ))}
        </nav>
      </div>
    </div>
  );
}
