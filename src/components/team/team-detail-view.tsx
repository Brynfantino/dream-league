import { Fragment } from "react";

import type { TeamPageDetail } from "@/lib/league/load-team-page";
import type { SquadOutfieldMember } from "@/lib/league/team-detail";
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

function formatOrdinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function groupOutfield(members: SquadOutfieldMember[]) {
  return POSITION_ORDER.map((position) => ({
    position,
    label: POSITION_GROUP_LABEL[position],
    members: members.filter((m) => m.position === position),
  })).filter((group) => group.members.length > 0);
}

export function TeamDetailView({ detail }: { detail: TeamPageDetail }) {
  const { current_squad } = detail;
  const hasSquad =
    current_squad.goalkeeper !== null || current_squad.outfield.length > 0;
  const outfieldGroups = groupOutfield(current_squad.outfield);

  return (
    <div className="space-y-10">
      <section className="space-y-5" aria-labelledby="team-overview">
        <div className="space-y-1">
          <h2
            id="team-overview"
            className="font-display text-3xl tracking-wide text-pitch-950 sm:text-4xl"
          >
            {detail.team.name}
          </h2>
          <p className="text-sm text-pitch-700">
            {detail.managers.length > 0
              ? detail.managers.join(" · ")
              : "No managers listed"}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="border-t border-pitch-300 pt-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
              Position
            </dt>
            <dd className="mt-1 font-display text-2xl tracking-wide tabular-nums text-pitch-950">
              {formatOrdinal(detail.league_position)}
            </dd>
          </div>
          <div className="border-t border-pitch-300 pt-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
              Points
            </dt>
            <dd className="mt-1 font-display text-2xl tracking-wide tabular-nums text-pitch-950">
              {detail.league_points}
            </dd>
          </div>
          <div className="border-t border-pitch-300 pt-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
              Goals For
            </dt>
            <dd className="mt-1 font-display text-2xl tracking-wide tabular-nums text-pitch-950">
              {detail.goals_for}
            </dd>
          </div>
          <div className="border-t border-pitch-300 pt-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
              Goals Against
            </dt>
            <dd className="mt-1 font-display text-2xl tracking-wide tabular-nums text-pitch-950">
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
                  <tr className="border-b border-pitch-200/80 text-pitch-950">
                    <td className="px-3 py-3 text-pitch-700">GK</td>
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
                      className="border-b border-pitch-200/80 text-pitch-950 last:border-0"
                    >
                      <td className="px-3 py-3 text-pitch-700">
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
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
