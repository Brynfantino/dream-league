"use client";

import { useRouter, usePathname } from "next/navigation";

import type {
  SeasonArchiveOption,
  SeasonArchiveRow,
  SeasonArchiveSummary,
} from "@/lib/league/load-season-archive";

const columns = [
  { key: "position", label: "Position", align: "left" as const },
  { key: "team", label: "Team", align: "left" as const },
  { key: "manager", label: "Manager", align: "left" as const },
  { key: "pts", label: "League Points", align: "right" as const },
  { key: "gf", label: "Goals For", align: "right" as const },
  { key: "ga", label: "Goals Against", align: "right" as const },
] as const;

type SeasonArchiveViewProps = {
  seasons: SeasonArchiveOption[];
  selectedId: string;
  summary: SeasonArchiveSummary;
  rows: SeasonArchiveRow[];
};

export function SeasonArchiveView({
  seasons,
  selectedId,
  summary,
  rows,
}: SeasonArchiveViewProps) {
  const router = useRouter();
  const pathname = usePathname();

  function onSeasonChange(nextId: string) {
    const params = new URLSearchParams();
    params.set("season", nextId);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-pitch-800">
          <span className="font-medium text-pitch-900">Season</span>
          <select
            className="min-w-[12rem] rounded-md border border-pitch-400 bg-white px-3 py-2 text-pitch-950"
            value={selectedId}
            onChange={(e) => onSeasonChange(e.target.value)}
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.is_active ? " (active)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Season summary — keep concise; extend later with Cup / BFL if needed */}
      <section
        aria-labelledby="season-archive-summary-heading"
        className="border border-pitch-300 bg-pitch-50/70 px-4 py-3 text-sm text-pitch-900"
      >
        <h3 id="season-archive-summary-heading" className="sr-only">
          Season summary
        </h3>
        <dl className="flex flex-wrap gap-x-6 gap-y-1">
          <div>
            <dt className="inline text-pitch-600">Season: </dt>
            <dd className="inline font-medium">{summary.season_name}</dd>
          </div>
          <div>
            <dt className="inline text-pitch-600">Champion: </dt>
            <dd className="inline font-medium">
              {summary.champion ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="inline text-pitch-600">Runner-Up: </dt>
            <dd className="inline font-medium">
              {summary.runner_up ?? "—"}
            </dd>
          </div>
        </dl>
      </section>

      {/* Final league table */}
      <section aria-labelledby="season-archive-table-heading" className="space-y-3">
        <h3
          id="season-archive-table-heading"
          className="font-display text-2xl tracking-wide text-pitch-950"
        >
          Final League Table
        </h3>
        <SeasonArchiveTable rows={rows} />
      </section>

      {/* Reserved for future season-level archive blocks (Cup, BFL, transfers). */}
    </div>
  );
}

function SeasonArchiveTable({ rows }: { rows: SeasonArchiveRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-pitch-700">
        No teams recorded for this season.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          Final league standings for the selected season
        </caption>
        <thead>
          <tr className="border-b border-pitch-300 text-pitch-800">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`whitespace-nowrap px-3 py-3 font-semibold ${
                  col.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.team_id}
              className="border-b border-pitch-200/80 text-pitch-950 last:border-0"
            >
              <td className="px-3 py-3 tabular-nums">{row.position}</td>
              <td className="px-3 py-3 font-medium">{row.team_name}</td>
              <td className="px-3 py-3 text-pitch-800">
                {row.manager_label ?? "—"}
              </td>
              <td className="px-3 py-3 text-right font-semibold tabular-nums">
                {row.points}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {row.goals_for}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {row.goals_against}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
