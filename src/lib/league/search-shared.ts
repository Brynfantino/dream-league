/**
 * Client-safe search index types and matching (no next/server / Supabase).
 */

export type SearchEntityKind = "player" | "team" | "manager";

export type SearchHit = {
  kind: SearchEntityKind;
  /** Stable React key */
  id: string;
  label: string;
  subtitle: string | null;
  /** Profile deep link; null when no navigable target (e.g. former franchise). */
  href: string | null;
  /** Lowercased match strings (label + aliases / historical names). */
  terms: string[];
};

export type SearchIndex = {
  entries: SearchHit[];
};

const KIND_RANK: Record<SearchEntityKind, number> = {
  team: 0,
  player: 1,
  manager: 2,
};

export const SEARCH_KIND_LABEL: Record<SearchEntityKind, string> = {
  player: "Player",
  team: "Team",
  manager: "Manager",
};

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function termScore(term: string, q: string): number | null {
  if (!term || !q) return null;
  if (term === q) return 0;
  if (term.startsWith(q)) return 1;
  const parts = term.split(/[\s'\-./]+/);
  if (parts.some((part) => part.startsWith(q))) return 2;
  if (term.includes(q)) return 3;
  return null;
}

function bestScore(hit: SearchHit, q: string): number | null {
  let best: number | null = null;
  for (const term of hit.terms) {
    const score = termScore(term, q);
    if (score == null) continue;
    if (best == null || score < best) best = score;
  }
  return best;
}

/** Ranked type-ahead matches; empty query yields no hits. */
export function matchSearchIndex(
  entries: SearchHit[],
  query: string,
  limit = 10,
): SearchHit[] {
  const q = normalizeSearchQuery(query);
  if (!q) return [];

  const scored: { hit: SearchHit; score: number }[] = [];
  for (const hit of entries) {
    const score = bestScore(hit, q);
    if (score == null) continue;
    scored.push({ hit, score });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    const kindDiff = KIND_RANK[a.hit.kind] - KIND_RANK[b.hit.kind];
    if (kindDiff !== 0) return kindDiff;
    return a.hit.label.localeCompare(b.hit.label, undefined, {
      sensitivity: "base",
    });
  });

  return scored.slice(0, limit).map((row) => row.hit);
}
