"use client";

import Link from "next/link";

type TopNavProps = {
  onMenuClick: () => void;
};

export function TopNav({ onMenuClick }: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-pitch-200 bg-pitch-50/90 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-pitch-300 text-pitch-900 lg:hidden"
        aria-label="Open navigation"
      >
        <span className="sr-only">Open menu</span>
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-pitch-950">
            Dream League
          </p>
          <p className="hidden truncate text-xs text-pitch-600 sm:block">
            Fantasy football foundation
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3 text-sm">
          <Link
            href="/account"
            className="rounded-md px-3 py-1.5 text-pitch-800 hover:bg-pitch-100"
          >
            Account
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-pitch-900 px-3 py-1.5 font-medium text-white hover:bg-pitch-800"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}
