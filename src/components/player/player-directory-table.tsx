import {
  POSITION_LABEL,
  type PlayerDirectoryRow,
} from "@/lib/league/player-directory";

function formatAcquiredAt(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PlayerDirectoryTable({ rows }: { rows: PlayerDirectoryRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-pitch-700">
        No players match the current filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          Player directory with name, position, current team, goals, club, and
          acquisition date
        </caption>
        <thead>
          <tr className="border-b border-pitch-300 text-pitch-800">
            <th scope="col" className="px-3 py-3 font-semibold">
              Player Name
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Position
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Current Team
            </th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">
              Goals
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Club
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Acquisition Date
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.player_id}
              className="border-b border-pitch-200/80 text-pitch-950 last:border-0"
            >
              <td className="px-3 py-3 font-medium">{row.name}</td>
              <td className="px-3 py-3">{POSITION_LABEL[row.position]}</td>
              <td className="px-3 py-3">{row.team_name ?? "—"}</td>
              <td className="px-3 py-3 text-right tabular-nums">{row.goals}</td>
              <td className="px-3 py-3 text-pitch-700">{row.club ?? "—"}</td>
              <td className="px-3 py-3 tabular-nums text-pitch-700">
                {formatAcquiredAt(row.acquired_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
