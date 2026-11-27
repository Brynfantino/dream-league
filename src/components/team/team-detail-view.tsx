import Image from "next/image";
import { Fragment } from "react";

import { PlayerNameLink } from "@/components/league/player-name-link";
import { TeamHistoryView } from "@/components/team/team-history-view";
import {
  ContributionCell,
  TEAM_HISTORY_TABLE_WIDTH,
  TEAM_SQUAD_TABLE_CLASS,
  TeamSquadColGroup,
  contributionClass,
} from "@/components/team/team-squad-table-layout";
import type { TeamPageDetail } from "@/lib/league/load-team-page";
import { teamBadgeUrlForTeamName } from "@/lib/league/team-badges";
import {
  formatContribution,
  goalkeeperContribution,
  outfieldContribution,
  type SquadOutfieldMember,
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

function teamInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function TeamDetailView({ detail }: { detail: TeamPageDetail }) {
  const { current_squad } = detail;
  const hasSquad =
    current_squad.goalkeeper !== null || current_squad.outfield.length > 0;
  const outfieldGroups = groupOutfield(current_squad.outfield);
  // Same SoT as League Table: Points = GF − GA via deriveStandings.
  const teamTotal = detail.league_points;
  const crestUrl = teamBadgeUrlForTeamName(detail.team.name);

  return (
    <div className="space-y-10">
      <section
        className="flex flex-col gap-6 sm:flex-row sm:items-start"
        aria-labelledby="team-overview"
      >
        <div className="relative h-40 w-40 shrink-0 overflow-hidden border border-pitch-300 bg-pitch-100 sm:h-48 sm:w-48">
          {crestUrl ? (
            <Image
              src={crestUrl}
              alt=""
              fill
              className="object-contain p-2"
              sizes="192px"
            />
          ) : (
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-pitch-200 via-pitch-100 to-pitch-300"
              aria-hidden
            >
              <span className="font-display text-4xl tracking-wide text-pitch-800">
                {teamInitials(detail.team.name)}
              </span>
              <span className="text-[0.65rem] uppercase tracking-[0.18em] text-pitch-600">
                Crest soon
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-5">
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

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="border-t border-pitch-300 pt-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
              Outfield Transfers Used
            </dt>
            <dd className="mt-1 font-display text-2xl tracking-wide tabular-nums text-pitch-950">
              {detail.transfer_usage.outfield_used}
              <span className="ml-1 text-base font-sans font-normal text-pitch-600">
                / {detail.transfer_usage.outfield_limit}
              </span>
            </dd>
          </div>
          <div className="border-t border-pitch-300 pt-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
              Outfield Transfers Remaining
            </dt>
            <dd className="mt-1 font-display text-2xl tracking-wide tabular-nums text-pitch-950">
              {detail.transfer_usage.outfield_remaining}
            </dd>
          </div>
          <div className="border-t border-pitch-300 pt-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
              Goalkeeper Transfers Used
            </dt>
            <dd className="mt-1 font-display text-2xl tracking-wide tabular-nums text-pitch-950">
              {detail.transfer_usage.goalkeeper_used}
              <span className="ml-1 text-base font-sans font-normal text-pitch-600">
                / {detail.transfer_usage.goalkeeper_limit}
              </span>
            </dd>
          </div>
          <div className="border-t border-pitch-300 pt-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
              Goalkeeper Transfers Remaining
            </dt>
            <dd className="mt-1 font-display text-2xl tracking-wide tabular-nums text-pitch-950">
              {detail.transfer_usage.goalkeeper_remaining}
            </dd>
          </div>
        </dl>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="current-squad">
        <h2
          id="current-squad"
          className="font-display text-xl tracking-wide text-pitch-950"
        >
          Current Squad
        </h2>
        <div className="overflow-x-auto">
          <table
            className={TEAM_SQUAD_TABLE_CLASS}
            style={{ width: TEAM_HISTORY_TABLE_WIDTH }}
          >
            <caption className="sr-only">
              Current squad with position, name, club, and contribution. Team
              total is league points (goals for minus goals against).
            </caption>
            {/* Same 5-col grid as History; final column reserved/empty so shared columns align. */}
            <TeamSquadColGroup withCurrentOwner />
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
                <th scope="col" className="px-3 py-3">
                  <span className="sr-only">Current Owner (History only)</span>
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
                    <td className="px-3 py-3">Goalkeeper</td>
                    <td className="px-3 py-3 text-pitch-600">—</td>
                    <td className="truncate px-3 py-3 font-medium">
                      {current_squad.goalkeeper.name}
                    </td>
                    <ContributionCell
                      value={goalkeeperContribution(
                        current_squad.goalkeeper.concessions,
                      )}
                    />
                    <td className="px-3 py-3" aria-hidden="true" />
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
                      className="border-b border-pitch-200/80 text-pitch-950"
                    >
                      <td className="px-3 py-3 text-pitch-700">
                        {POSITION_LABEL[player.position]}
                      </td>
                      <td className="truncate px-3 py-3 font-medium">
                        <PlayerNameLink
                          name={player.name}
                          playerId={player.player_id}
                        />
                      </td>
                      <td className="truncate px-3 py-3 text-pitch-700">
                        {player.club ?? "—"}
                      </td>
                      <ContributionCell
                        value={outfieldContribution(player.goals)}
                      />
                      <td className="px-3 py-3" aria-hidden="true" />
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
            {hasSquad ? (
              <tfoot>
                <tr className="border-t-2 border-pitch-300 text-pitch-950">
                  <th
                    scope="row"
                    colSpan={3}
                    className="px-3 py-3 text-left font-semibold"
                  >
                    League Points
                  </th>
                  <td
                    className={`px-3 py-3 text-right ${contributionClass(teamTotal)}`}
                  >
                    {formatContribution(teamTotal)}
                  </td>
                  <td className="px-3 py-3" aria-hidden="true" />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>

      <TeamHistoryView
        outfield={detail.team_history.outfield}
        goalkeepers={detail.team_history.goalkeepers}
      />
    </div>
  );
}
