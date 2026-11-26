import type {
  TeamHistoryGoalkeeper,
  TeamHistoryOutfield,
} from "@/lib/league/team-detail";
import type { PlayerPosition } from "@/types/database";

const POSITION_LABEL: Record<PlayerPosition, string> = {
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

export function TeamHistoryView({
  outfield,
  goalkeepers,
}: {
  outfield: TeamHistoryOutfield[];
  goalkeepers: TeamHistoryGoalkeeper[];
}) {
  const hasHistory = outfield.length > 0 || goalkeepers.length > 0;

  return (
    <section className="space-y-6" aria-labelledby="team-history">
      <div className="space-y-1 border-t border-pitch-300 pt-8">
        <h2
          id="team-history"
          className="font-display text-xl tracking-wide text-pitch-950"
        >
          Team History (Active Season)
        </h2>
        <p className="text-sm text-pitch-700">
          Previously owned assets only. Goals and concessions count while this
          team owned them.
        </p>
      </div>

      {!hasHistory ? (
        <p className="text-sm text-pitch-700">
          No previously owned players or goalkeeper clubs this season.
        </p>
      ) : null}

      {outfield.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-pitch-700">
            Outfield players
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Previously owned outfield players with goals while owned and
                current owner
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
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Current Owner
                  </th>
                </tr>
              </thead>
              <tbody>
                {outfield.map((player) => (
                  <tr
                    key={player.player_id}
                    className="border-b border-pitch-200/80 text-pitch-950 last:border-0"
                  >
                    <td className="px-3 py-3 text-pitch-700">
                      {POSITION_LABEL[player.position]}
                    </td>
                    <td className="px-3 py-3 font-medium">{player.name}</td>
                    <td className="px-3 py-3 text-pitch-700">
                      {player.club ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-pitch-700">
                      {player.goals}
                    </td>
                    <td className="px-3 py-3 text-pitch-700">
                      {player.current_owner ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {goalkeepers.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-pitch-700">
            Goalkeeper clubs
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Previously owned goalkeeper clubs with concessions while owned
                and current owner
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
                    Conceded
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Current Owner
                  </th>
                </tr>
              </thead>
              <tbody>
                {goalkeepers.map((club) => (
                  <tr
                    key={club.goalkeeper_club_id}
                    className="border-b border-pitch-200/80 text-pitch-950 last:border-0"
                  >
                    <td className="px-3 py-3 font-medium">{club.name}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-red-800">
                      {club.concessions}
                    </td>
                    <td className="px-3 py-3 text-pitch-700">
                      {club.current_owner ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
