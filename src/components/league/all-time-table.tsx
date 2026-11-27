"use client";

import { useState } from "react";

import {
  formatHonoursSummary,
  type AllTimeTableRow,
} from "@/lib/league/load-all-time-table";

type SortKey =
  | "points"
  | "avg_points"
  | "goals_for"
  | "goals_against"
  | "seasons"
  | "honours";

type SortDir = "asc" | "desc";

const columns: {
  key: string;
  label: string;
  align: "left" | "right";
  sortKey?: SortKey;
}[] = [
  { key: "position", label: "Position", align: "left" },
  { key: "team", label: "Team", align: "left" },
  { key: "status", label: "Status", align: "left" },
  { key: "seasons", label: "Seasons", align: "right", sortKey: "seasons" },
  { key: "honours", label: "Honours", align: "left", sortKey: "honours" },
  { key: "gf", label: "Goals For", align: "right", sortKey: "goals_for" },
  {
    key: "ga",
    label: "Goals Against",
    align: "right",
    sortKey: "goals_against",
  },
  { key: "pts", label: "League Points", align: "right", sortKey: "points" },
  {
    key: "avg",
    label: "Avg Points / Season",
    align: "right",
    sortKey: "avg_points",
  },
];

function honourTotal(row: AllTimeTableRow): number {
  return row.league_titles + row.cup_titles;
}

function compareRows(
  a: AllTimeTableRow,
  b: AllTimeTableRow,
  sortKey: SortKey,
  sortDir: SortDir,
): number {
  const dir = sortDir === "asc" ? 1 : -1;
  let primary = 0;

  switch (sortKey) {
    case "points":
      primary = a.points - b.points;
      if (primary === 0) primary = a.goals_for - b.goals_for;
      break;
    case "avg_points":
      primary = a.avg_points_per_season - b.avg_points_per_season;
      if (primary === 0) primary = a.points - b.points;
      break;
    case "goals_for":
      primary = a.goals_for - b.goals_for;
      break;
    case "goals_against":
      primary = a.goals_against - b.goals_against;
      break;
    case "seasons":
      primary = a.seasons_played.length - b.seasons_played.length;
      break;
    case "honours":
      primary = honourTotal(a) - honourTotal(b);
      if (primary === 0) primary = a.league_titles - b.league_titles;
      if (primary === 0) primary = a.cup_titles - b.cup_titles;
      break;
  }

  if (primary !== 0) return primary * dir;
  return a.display_name.localeCompare(b.display_name);
}

export function AllTimeTable({ rows }: { rows: AllTimeTableRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  /** Default false = show every franchise, including former. */
  const [hideInactive, setHideInactive] = useState(false);

  const visibleRows = hideInactive
    ? rows.filter((row) => row.is_active_franchise)
    : rows;

  const sortedRows = [...visibleRows].sort((a, b) =>
    compareRows(a, b, sortKey, sortDir),
  );

  const formerCount = rows.filter((row) => !row.is_active_franchise).length;

  function onSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    // Natural first click: most scored / most titles / most seasons / most points
    // GA: most conceded first (toggle for stingiest defence)
    setSortDir("desc");
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-pitch-700">
        No franchises found across seasons yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-pitch-600">
          Sorted by{" "}
          {columns.find((c) => c.sortKey === sortKey)?.label ?? sortKey} (
          {sortDir === "desc" ? "high → low" : "low → high"}). Position stays
          the points ranking. Click a column header to sort.
        </p>
        <button
          type="button"
          onClick={() => setHideInactive((v) => !v)}
          aria-pressed={hideInactive}
          className={`shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            hideInactive
              ? "border-pitch-800 bg-pitch-800 text-white"
              : "border-pitch-400 bg-white text-pitch-900 hover:bg-pitch-100"
          }`}
        >
          {hideInactive
            ? "Show inactive franchises"
            : "Hide inactive franchises"}
        </button>
      </div>
      {hideInactive && formerCount > 0 ? (
        <p className="text-xs text-pitch-600">
          Hiding {formerCount} former franchise
          {formerCount === 1 ? "" : "s"}. Showing {sortedRows.length} active.
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
          <caption className="sr-only">
            All-time standings by franchise: position, team, active status,
            seasons played, league and cup honours, goals for, goals against,
            league points, and average points per season. Column headers are
            sortable.
          </caption>
          <thead>
            <tr className="border-b border-pitch-300 text-pitch-800">
              {columns.map((col) => {
                const active = col.sortKey === sortKey;
                const ariaSort = !col.sortKey
                  ? undefined
                  : active
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none";

                if (!col.sortKey) {
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      className={`whitespace-nowrap px-3 py-3 font-semibold ${
                        col.align === "right" ? "text-right" : "text-left"
                      }`}
                    >
                      {col.label}
                    </th>
                  );
                }

                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={`whitespace-nowrap px-3 py-3 font-semibold ${
                      col.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSort(col.sortKey!)}
                      className={`inline-flex items-center gap-1 underline-offset-4 hover:underline ${
                        active ? "text-pitch-950" : "text-pitch-800"
                      } ${col.align === "right" ? "flex-row-reverse" : ""}`}
                    >
                      <span>{col.label}</span>
                      <span className="font-mono text-xs" aria-hidden>
                        {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr
                key={row.franchise_id}
                className={`border-b border-pitch-200/80 last:border-0 ${
                  row.is_active_franchise
                    ? "text-pitch-950"
                    : "text-pitch-700"
                }`}
              >
                <td className="px-3 py-3 tabular-nums">{row.position}</td>
                <td className="px-3 py-3 font-medium">
                  <span className="block">{row.display_name}</span>
                  {!row.is_active_franchise ? (
                    <span className="mt-0.5 block text-xs font-normal text-pitch-600">
                      Former franchise
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  {row.is_active_franchise ? (
                    <span className="text-pitch-800">Active</span>
                  ) : (
                    <span className="text-pitch-600">Former</span>
                  )}
                </td>
                <td
                  className="px-3 py-3 text-right tabular-nums"
                  title={row.seasons_played.join(", ")}
                >
                  {row.seasons_played.length}
                </td>
                <td className="px-3 py-3">
                  {formatHonoursSummary(row.league_titles, row.cup_titles)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {row.goals_for}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {row.goals_against}
                </td>
                <td className="px-3 py-3 text-right font-semibold tabular-nums">
                  {row.points}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {row.avg_points_per_season}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
