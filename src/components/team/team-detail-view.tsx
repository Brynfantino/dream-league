import type { TeamPageDetail } from "@/lib/league/load-team-page";
import type { PlayerPosition } from "@/types/database";

const POSITION_LABEL: Record<PlayerPosition, string> = {
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

export function TeamDetailView({ detail }: { detail: TeamPageDetail }) {
  const { current_squad } = detail;
  const hasSquad =
    current_squad.goalkeeper !== null || current_squad.outfield.length > 0;

  return (
    <div className="space-y-10">
      <section className="space-y-3" aria-labelledby="team-overview">
        <h2
          id="team-overview"
          className="font-display text-2xl tracking-wide text-pitch-950"
        >
          {detail.team.name}
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
              Manager(s)
            </dt>
            <dd className="mt-1 text-sm text-pitch-950">
              {detail.managers.length > 0
                ? detail.managers.join(", ")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
              League Position
            </dt>
            <dd className="mt-1 text-sm tabular-nums text-pitch-950">
              {detail.league_position}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
              League Points
            </dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums text-pitch-950">
              {detail.league_points}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
              Goals For
            </dt>
            <dd className="mt-1 text-sm tabular-nums text-pitch-950">
              {detail.goals_for}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
              Goals Against
            </dt>
            <dd className="mt-1 text-sm tabular-nums text-pitch-950">
              {detail.goals_against}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3" aria-labelledby="current-squad">
        <h2
          id="current-squad"
          className="font-display text-xl tracking-wide text-pitch-950"
        >
          Current Squad
        </h2>
        <p className="text-sm text-pitch-700">
          Active ownership only. Goals are outfield goals for this team;
          Conceded is the current goalkeeper club’s concessions for this team
          (from goal events).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <caption className="sr-only">
              Current squad with position, name, club, goals, and goalkeeper
              concessions
            </caption>
            <thead>
              <tr className="border-b border-pitch-300 text-pitch-800">
                <th scope="col" className="px-3 py-3 font-semibold">
                  Position
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Name
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Club
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-right font-semibold"
                >
                  Goals
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-right font-semibold"
                >
                  Conceded
                </th>
              </tr>
            </thead>
            <tbody>
              {!hasSquad ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-3 text-sm text-pitch-700"
                  >
                    No current squad members.
                  </td>
                </tr>
              ) : null}

              {current_squad.goalkeeper ? (
                <tr className="border-b border-pitch-200/80 text-pitch-950">
                  <td className="px-3 py-3">Goalkeeper</td>
                  <td className="px-3 py-3 font-medium">
                    {current_squad.goalkeeper.name}
                  </td>
                  <td className="px-3 py-3 text-pitch-700">—</td>
                  <td className="px-3 py-3 text-right tabular-nums text-pitch-600">
                    —
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {current_squad.goalkeeper.concessions}
                  </td>
                </tr>
              ) : null}

              {current_squad.outfield.map((player) => (
                <tr
                  key={player.player_id}
                  className="border-b border-pitch-200/80 text-pitch-950 last:border-0"
                >
                  <td className="px-3 py-3">
                    {POSITION_LABEL[player.position]}
                  </td>
                  <td className="px-3 py-3 font-medium">{player.name}</td>
                  <td className="px-3 py-3 text-pitch-700">
                    {player.club ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {player.goals}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-pitch-600">
                    —
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
