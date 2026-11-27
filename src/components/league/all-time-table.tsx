import type { AllTimeTableRow } from "@/lib/league/load-all-time-table";

const columns = [
  { key: "position", label: "Position", align: "left" as const },
  { key: "team", label: "Team", align: "left" as const },
  { key: "status", label: "Status", align: "left" as const },
  { key: "seasons", label: "Seasons", align: "right" as const },
  { key: "gf", label: "Goals For", align: "right" as const },
  { key: "ga", label: "Goals Against", align: "right" as const },
  { key: "pts", label: "League Points", align: "right" as const },
] as const;

export function AllTimeTable({ rows }: { rows: AllTimeTableRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-pitch-700">
        No franchises found across seasons yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          All-time standings by franchise: position, team, active status,
          seasons played, goals for, goals against, and league points
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
              <td className="px-3 py-3 text-right tabular-nums">
                {row.goals_for}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {row.goals_against}
              </td>
              <td className="px-3 py-3 text-right font-semibold tabular-nums">
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
