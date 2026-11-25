import type { TeamPageDetail } from "@/lib/league/load-team-page";
import type { PlayerPosition } from "@/types/database";

const POSITION_LABEL: Record<PlayerPosition, string> = {
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

export function TeamDetailView({ detail }: { detail: TeamPageDetail }) {
  const { current_squad } = detail;

  return (
    <div className="space-y-10">
      <section className="space-y-3" aria-labelledby="team-overview">
        <h2
          id="team-overview"
          className="font-display text-2xl tracking-wide text-pitch-950"
        >
          {detail.team.name}
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
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
        </dl>
      </section>

      <section className="space-y-3" aria-labelledby="current-squad">
        <h2
          id="current-squad"
          className="font-display text-xl tracking-wide text-pitch-950"
        >
          Current Squad
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
            <caption className="sr-only">
              Current squad including goalkeeper and outfield players
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
              </tr>
            </thead>
            <tbody>
              {current_squad.goalkeeper ? (
                <tr className="border-b border-pitch-200/80 text-pitch-950">
                  <td className="px-3 py-3">Goalkeeper</td>
                  <td className="px-3 py-3 font-medium">
                    {current_squad.goalkeeper.name}
                  </td>
                  <td className="px-3 py-3 text-pitch-700">—</td>
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
                </tr>
              ))}
              {!current_squad.goalkeeper &&
              current_squad.outfield.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-3 text-sm text-pitch-700"
                  >
                    No current squad members.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="player-goals">
        <h2
          id="player-goals"
          className="font-display text-xl tracking-wide text-pitch-950"
        >
          Player Goals
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[24rem] border-collapse text-left text-sm">
            <caption className="sr-only">
              Goals scored by outfield players for this team
            </caption>
            <thead>
              <tr className="border-b border-pitch-300 text-pitch-800">
                <th scope="col" className="px-3 py-3 font-semibold">
                  Player
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Position
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-right font-semibold"
                >
                  Goals
                </th>
              </tr>
            </thead>
            <tbody>
              {detail.player_goals.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-3 text-sm text-pitch-700"
                  >
                    No player goals recorded yet.
                  </td>
                </tr>
              ) : (
                detail.player_goals.map((row) => (
                  <tr
                    key={row.player_id}
                    className="border-b border-pitch-200/80 text-pitch-950 last:border-0"
                  >
                    <td className="px-3 py-3 font-medium">{row.name}</td>
                    <td className="px-3 py-3">
                      {POSITION_LABEL[row.position]}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.goals}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="gk-concessions">
        <h2
          id="gk-concessions"
          className="font-display text-xl tracking-wide text-pitch-950"
        >
          Goalkeeper Concessions
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[24rem] border-collapse text-left text-sm">
            <caption className="sr-only">
              Goals conceded by goalkeeper clubs for this team
            </caption>
            <thead>
              <tr className="border-b border-pitch-300 text-pitch-800">
                <th scope="col" className="px-3 py-3 font-semibold">
                  Goalkeeper Club
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-right font-semibold"
                >
                  Concessions
                </th>
              </tr>
            </thead>
            <tbody>
              {detail.goalkeeper_concessions.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-3 py-3 text-sm text-pitch-700"
                  >
                    No goalkeeper concessions recorded yet.
                  </td>
                </tr>
              ) : (
                detail.goalkeeper_concessions.map((row) => (
                  <tr
                    key={row.goalkeeper_club_id}
                    className="border-b border-pitch-200/80 text-pitch-950 last:border-0"
                  >
                    <td className="px-3 py-3 font-medium">
                      {row.name}
                      {row.is_current ? (
                        <span className="ml-2 text-xs font-normal text-pitch-600">
                          (current)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.concessions}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
