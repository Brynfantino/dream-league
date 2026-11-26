import { Fragment } from "react";

import {
  formatContribution,
  goalkeeperContribution,
  outfieldContribution,
  type TeamHistoryGoalkeeper,
  type TeamHistoryOutfield,
} from "@/lib/league/team-detail";
import type { PlayerPosition } from "@/types/database";

const POSITION_LABEL: Record<PlayerPosition, string> = {
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

const POSITION_GROUP_LABEL: Record<PlayerPosition, string> = {
  DEF: "Defenders",
  MID: "Midfielders",
  FWD: "Forwards",
};

const POSITION_ORDER: PlayerPosition[] = ["DEF", "MID", "FWD"];

function contributionClass(value: number): string {
  if (value > 0) return "font-semibold tabular-nums text-pitch-700";
  if (value < 0) return "font-semibold tabular-nums text-red-800";
  return "tabular-nums text-pitch-600";
}

function ContributionCell({ value }: { value: number }) {
  return (
    <td className={`px-3 py-3 text-right ${contributionClass(value)}`}>
      {formatContribution(value)}
    </td>
  );
}

function groupOutfield(members: TeamHistoryOutfield[]) {
  return POSITION_ORDER.map((position) => ({
    position,
    label: POSITION_GROUP_LABEL[position],
    members: members.filter((m) => m.position === position),
  })).filter((group) => group.members.length > 0);
}

export function TeamHistoryView({
  outfield,
  goalkeepers,
}: {
  outfield: TeamHistoryOutfield[];
  goalkeepers: TeamHistoryGoalkeeper[];
}) {
  const hasHistory = outfield.length > 0 || goalkeepers.length > 0;
  const outfieldGroups = groupOutfield(outfield);

  return (
    <section className="space-y-3" aria-labelledby="team-history">
      <div className="space-y-1 border-t border-pitch-300 pt-8">
        <h2
          id="team-history"
          className="font-display text-xl tracking-wide text-pitch-950"
        >
          Team History (Active Season)
        </h2>
        <p className="text-sm text-pitch-700">
          Previously owned assets only. Contribution counts while this team
          owned them — not transfer pairings.
        </p>
      </div>

      {!hasHistory ? (
        <p className="text-sm text-pitch-700">
          No previously owned players or goalkeeper clubs this season.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <caption className="sr-only">
              Previously owned squad with position, name, club, contribution
              while owned, and current owner
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
                  Contribution
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Current Owner
                </th>
              </tr>
            </thead>
            <tbody>
              {goalkeepers.length > 0 ? (
                <Fragment key="goalkeeper">
                  <tr className="border-b border-pitch-200/80 bg-pitch-50/60">
                    <th
                      scope="colgroup"
                      colSpan={5}
                      className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-pitch-700"
                    >
                      Goalkeeper
                    </th>
                  </tr>
                  {goalkeepers.map((club) => (
                    <tr
                      key={club.goalkeeper_club_id}
                      className="border-b border-pitch-200/80 text-pitch-950"
                    >
                      <td className="px-3 py-3">Goalkeeper</td>
                      <td className="px-3 py-3 text-pitch-600">—</td>
                      <td className="px-3 py-3 font-medium">{club.name}</td>
                      <ContributionCell
                        value={goalkeeperContribution(club.concessions)}
                      />
                      <td className="px-3 py-3 text-pitch-700">
                        {club.current_owner ?? "—"}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ) : null}

              {outfieldGroups.map((group) => (
                <Fragment key={group.position}>
                  <tr className="border-b border-pitch-200/80 bg-pitch-50/60">
                    <th
                      scope="colgroup"
                      colSpan={5}
                      className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-pitch-700"
                    >
                      {group.label}
                    </th>
                  </tr>
                  {group.members.map((player) => (
                    <tr
                      key={player.player_id}
                      className="border-b border-pitch-200/80 text-pitch-950"
                    >
                      <td className="px-3 py-3 text-pitch-700">
                        {POSITION_LABEL[player.position]}
                      </td>
                      <td className="px-3 py-3 font-medium">{player.name}</td>
                      <td className="px-3 py-3 text-pitch-700">
                        {player.club ?? "—"}
                      </td>
                      <ContributionCell
                        value={outfieldContribution(player.goals)}
                      />
                      <td className="px-3 py-3 text-pitch-700">
                        {player.current_owner ?? "—"}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
