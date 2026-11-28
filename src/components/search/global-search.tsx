"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  matchSearchIndex,
  SEARCH_KIND_LABEL,
  type SearchHit,
} from "@/lib/league/search-shared";

type GlobalSearchProps = {
  entries: SearchHit[];
};

export function GlobalSearch({ entries }: GlobalSearchProps) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [, startTransition] = useTransition();

  const hits = matchSearchIndex(entries, query, 10);
  const showPanel = open && normalizeVisible(query);

  const close = useEffectEvent(() => {
    setOpen(false);
    setActiveIndex(0);
  });

  const navigateTo = useEffectEvent((hit: SearchHit) => {
    if (!hit.href) return;
    close();
    setQuery("");
    startTransition(() => {
      router.push(hit.href!);
    });
  });

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [close]);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showPanel) {
      if (event.key === "Escape") {
        setQuery("");
        inputRef.current?.blur();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (hits.length === 0 ? 0 : (i + 1) % hits.length));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) =>
        hits.length === 0 ? 0 : (i - 1 + hits.length) % hits.length,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const hit = hits[activeIndex];
      if (hit) navigateTo(hit);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      setQuery("");
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1 max-w-md">
      <label className="sr-only" htmlFor={`${listId}-input`}>
        Search Dream League
      </label>
      <input
        ref={inputRef}
        id={`${listId}-input`}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showPanel && hits[activeIndex]
            ? `${listId}-option-${activeIndex}`
            : undefined
        }
        value={query}
        placeholder="Search players, teams, managers…"
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-full rounded border border-pitch-300 bg-white px-3 py-1.5 text-sm text-pitch-950 placeholder:text-pitch-500 focus:border-pitch-500 focus:outline-none focus:ring-1 focus:ring-pitch-400"
      />

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto border border-pitch-300 bg-pitch-50 shadow-md"
        >
          {hits.length === 0 ? (
            <p className="px-3 py-3 text-sm text-pitch-600">No matches</p>
          ) : (
            <ul className="py-1">
              {hits.map((hit, index) => {
                const active = index === activeIndex;
                const kind = SEARCH_KIND_LABEL[hit.kind];
                const content = (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-pitch-950">
                        {hit.label}
                      </span>
                      {hit.subtitle ? (
                        <span className="block truncate text-xs text-pitch-600">
                          {hit.subtitle}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-pitch-500">
                      {kind}
                    </span>
                  </>
                );

                if (!hit.href) {
                  return (
                    <li
                      key={hit.id}
                      id={`${listId}-option-${index}`}
                      role="option"
                      aria-selected={active}
                      aria-disabled
                      className={`flex cursor-default items-center gap-3 px-3 py-2 text-sm opacity-60 ${
                        active ? "bg-pitch-100" : ""
                      }`}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      {content}
                    </li>
                  );
                }

                return (
                  <li
                    key={hit.id}
                    id={`${listId}-option-${index}`}
                    role="option"
                    aria-selected={active}
                    className={active ? "bg-pitch-100" : undefined}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <Link
                      href={hit.href}
                      className="flex items-center gap-3 px-3 py-2 text-sm"
                      onClick={() => {
                        close();
                        setQuery("");
                      }}
                    >
                      {content}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function normalizeVisible(query: string): boolean {
  return query.trim().length > 0;
}

/** Lightweight placeholder while the search index loads. */
export function GlobalSearchFallback() {
  return (
    <div className="min-w-0 flex-1 max-w-md">
      <div
        className="h-[2.125rem] w-full rounded border border-pitch-200 bg-pitch-100/80"
        aria-hidden
      />
      <span className="sr-only">Loading search</span>
    </div>
  );
}
