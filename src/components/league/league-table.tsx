import type { LeagueTableRow } from "@/lib/league/standings";

const columns = [
  { key: "position", label: "Position", align: "left" as const },
  { key: "team", label: "Team", align: "left" as const },
  { key: "gf", label: "Goals For", align: "right" as const },
  { key: "ga", label: "Goals Against", align: "right" as const },
  { key: "pts", label: "League Points", align: "right" as const },
] as const;

export function LeagueTable({ rows }: { rows: LeagueTableRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-pitch-700">
        No teams in the active season yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          League standings by position, team, goals for, goals against, and
          league points
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
