"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffectEvent } from "react";

import { PlayerNameLink } from "@/components/league/player-name-link";
import {
  ContributionCell,
  TEAM_SQUAD_TABLE_CLASS,
  TeamSquadColGroup,
  contributionClass,
} from "@/components/team/team-squad-table-layout";
import type {
  FranchiseHistoryOption,
  FranchiseHistorySnapshot,
  FranchiseSeasonOption,
} from "@/lib/league/franchise-history-shared";
import { teamBadgeUrlForFranchiseId } from "@/lib/league/team-badges";
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

const SQUAD_TABLE_WIDTH = `${9 + 14 + 14 + 7}rem`;

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

function formatTransferDate(iso: string): string {
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return iso;
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

type FranchiseHistoryViewProps = {
  franchises: FranchiseHistoryOption[];
  seasons: FranchiseSeasonOption[];
  selectedFranchiseId: string;
  selectedSeasonId: string;
  snapshot: FranchiseHistorySnapshot;
};

export function FranchiseHistoryView({
  franchises,
  seasons,
  selectedFranchiseId,
  selectedSeasonId,
  snapshot,
}: FranchiseHistoryViewProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navigate = useEffectEvent(
    (franchise: string, season: string | null) => {
      const params = new URLSearchParams();
      params.set("franchise", franchise);
      if (season) params.set("season", season);
      router.push(`${pathname}?${params.toString()}`);
    },
  );

  const onFranchiseChange = useEffectEvent((nextFranchise: string) => {
    // Drop season so the loader picks this franchise’s default campaign.
    navigate(nextFranchise, null);
  });

  const onSeasonChange = useEffectEvent((nextSeason: string) => {
    navigate(selectedFranchiseId, nextSeason);
  });

  const { end_squad } = snapshot;
  const hasSquad =
    end_squad.goalkeeper !== null || end_squad.outfield.length > 0;
  const outfieldGroups = groupOutfield(end_squad.outfield);
  const crestUrl = teamBadgeUrlForFranchiseId(snapshot.franchise_id);
  const honourBadges = [
    snapshot.honours.league_champions
      ? { key: "league", label: "League Champion" }
      : null,
    snapshot.honours.cup_winners ? { key: "cup", label: "Cup Winner" } : null,
    snapshot.honours.bfl_winners ? { key: "bfl", label: "BFL Winner" } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  const hasTransfers =
    snapshot.transfers.outfield.length > 0 ||
    snapshot.transfers.goalkeeper.length > 0;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-pitch-800">
          <span className="font-medium text-pitch-900">Franchise</span>
          <select
            className="min-w-[14rem] rounded-md border border-pitch-400 bg-white px-3 py-2 text-pitch-950"
            value={selectedFranchiseId}
            onChange={(e) => onFranchiseChange(e.target.value)}
          >
            {franchises.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-pitch-800">
          <span className="font-medium text-pitch-900">Season</span>
          <select
            className="min-w-[12rem] rounded-md border border-pitch-400 bg-white px-3 py-2 text-pitch-950"
            value={selectedSeasonId}
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

      {/* Snapshot header — historical campaign feel */}
      <section
        className="flex flex-col gap-6 border border-pitch-300 bg-gradient-to-br from-pitch-50 via-white to-pitch-100/70 p-5 sm:flex-row sm:items-start sm:p-6"
        aria-labelledby="franchise-snapshot-heading"
      >
        <div className="relative h-36 w-36 shrink-0 overflow-hidden border border-pitch-300 bg-pitch-100 sm:h-44 sm:w-44">
          {crestUrl ? (
            <Image
              src={crestUrl}
              alt=""
              fill
              className="object-contain p-2"
              sizes="176px"
            />
          ) : (
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-pitch-200 via-pitch-100 to-pitch-300"
              aria-hidden
            >
              <span className="font-display text-4xl tracking-wide text-pitch-800">
                {teamInitials(snapshot.team.name)}
              </span>
              <span className="text-[0.65rem] uppercase tracking-[0.18em] text-pitch-600">
                Crest soon
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-pitch-600">
              {snapshot.season.name}
              {snapshot.season.is_active ? " · in progress" : " · final"}
            </p>
            <h3
              id="franchise-snapshot-heading"
              className="font-display text-3xl tracking-wide text-pitch-950 sm:text-4xl"
            >
              {snapshot.team.name}
            </h3>
            <p className="text-sm text-pitch-700">
              {snapshot.managers.length > 0
                ? snapshot.managers.join(" · ")
                : "No managers listed"}
            </p>
          </div>

          {honourBadges.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Season honours">
              {honourBadges.map((badge) => (
                <li
                  key={badge.key}
                  className="border border-pitch-400 bg-pitch-100/90 px-3 py-1.5 text-sm font-medium text-pitch-900"
                >
                  <span aria-hidden>🏆 </span>
                  {badge.label}
                </li>
              ))}
            </ul>
          ) : null}

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="border-t border-pitch-300 pt-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
                Position
              </dt>
              <dd className="mt-1 font-display text-2xl tracking-wide tabular-nums text-pitch-950">
                {formatOrdinal(snapshot.league_position)}
              </dd>
            </div>
            <div className="border-t border-pitch-300 pt-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
                Points
              </dt>
              <dd className="mt-1 font-display text-2xl tracking-wide tabular-nums text-pitch-950">
                {snapshot.league_points}
              </dd>
            </div>
            <div className="border-t border-pitch-300 pt-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
                Goals For
              </dt>
              <dd className="mt-1 font-display text-2xl tracking-wide tabular-nums text-pitch-950">
                {snapshot.goals_for}
              </dd>
            </div>
            <div className="border-t border-pitch-300 pt-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
                Goals Against
              </dt>
              <dd className="mt-1 font-display text-2xl tracking-wide tabular-nums text-pitch-950">
                {snapshot.goals_against}
              </dd>
            </div>
          </dl>

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-2">
            <div className="border-t border-pitch-300 pt-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
                Outfield Transfers Used
              </dt>
              <dd className="mt-1 font-display text-2xl tracking-wide tabular-nums text-pitch-950">
                {snapshot.transfer_usage.outfield_used}
                <span className="ml-1 text-base font-sans font-normal text-pitch-600">
                  / {snapshot.transfer_usage.outfield_limit}
                </span>
              </dd>
            </div>
            <div className="border-t border-pitch-300 pt-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
                Goalkeeper Transfers Used
              </dt>
              <dd className="mt-1 font-display text-2xl tracking-wide tabular-nums text-pitch-950">
                {snapshot.transfer_usage.goalkeeper_used}
                <span className="ml-1 text-base font-sans font-normal text-pitch-600">
                  / {snapshot.transfer_usage.goalkeeper_limit}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* End-of-season squad */}
      <section className="space-y-3" aria-labelledby="end-squad-heading">
        <header className="space-y-1">
          <h3
            id="end-squad-heading"
            className="font-display text-xl tracking-wide text-pitch-950"
          >
            End-of-Season Squad
          </h3>
          <p className="text-sm text-pitch-700">
            Assets still owned when the campaign closed
            {snapshot.season.is_active ? " (current ownership while the season is active)" : ""}.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table
            className={TEAM_SQUAD_TABLE_CLASS}
            style={{ width: SQUAD_TABLE_WIDTH }}
          >
            <caption className="sr-only">
              End-of-season squad with position, name, club, and contribution.
            </caption>
            <TeamSquadColGroup />
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
                <th scope="col" className="px-3 py-3 text-right font-semibold">
                  Contribution
                </th>
              </tr>
            </thead>
            <tbody>
              {!hasSquad ? (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-sm text-pitch-700">
                    No end-of-season squad members recorded.
                  </td>
                </tr>
              ) : null}

              {end_squad.goalkeeper ? (
                <Fragment key="goalkeeper">
                  <tr className="border-b border-pitch-200/80 bg-pitch-50/60">
                    <th
                      scope="colgroup"
                      colSpan={4}
                      className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-pitch-700"
                    >
                      Goalkeeper
                    </th>
                  </tr>
                  <tr className="border-b border-pitch-200/80 text-pitch-950">
                    <td className="px-3 py-3">Goalkeeper</td>
                    <td className="px-3 py-3 text-pitch-600">—</td>
                    <td className="truncate px-3 py-3 font-medium">
                      {end_squad.goalkeeper.name}
                    </td>
                    <ContributionCell
                      value={goalkeeperContribution(
                        end_squad.goalkeeper.concessions,
                      )}
                    />
                  </tr>
                </Fragment>
              ) : null}

              {outfieldGroups.map((group) => (
                <Fragment key={group.position}>
                  <tr className="border-b border-pitch-200/80 bg-pitch-50/60">
                    <th
                      scope="colgroup"
                      colSpan={4}
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
                    className={`px-3 py-3 text-right ${contributionClass(snapshot.league_points)}`}
                  >
                    {formatContribution(snapshot.league_points)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>

      {/* Transfers */}
      <section className="space-y-3" aria-labelledby="transfers-heading">
        <header className="space-y-1">
          <h3
            id="transfers-heading"
            className="font-display text-xl tracking-wide text-pitch-950"
          >
            Transfer Summary
          </h3>
          <p className="text-sm text-pitch-700">
            Derived from ownership stints, with Dream League contribution for
            each outgoing and incoming asset while owned in this campaign.
          </p>
        </header>

        {snapshot.transfers.dates_uncertain ? (
          <p className="border border-pitch-300 bg-pitch-50/80 px-4 py-3 text-sm text-pitch-800">
            Transfer dates are incomplete for this season, so mid-season moves
            cannot be listed with confidence.
          </p>
        ) : null}

        {!snapshot.transfers.dates_uncertain && !hasTransfers ? (
          <p className="text-sm text-pitch-700">
            No mid-season transfers recorded for this campaign.
          </p>
        ) : null}

        {hasTransfers ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-pitch-300 text-pitch-800">
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Out</th>
                  <th className="px-3 py-3 font-semibold">In</th>
                  <th className="px-3 py-3 font-semibold">Position</th>
                  <th className="px-3 py-3 text-right font-semibold">
                    Out contrib.
                  </th>
                  <th className="px-3 py-3 text-right font-semibold">
                    In contrib.
                  </th>
                </tr>
              </thead>
              <tbody>
                {snapshot.transfers.outfield.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-pitch-200/80 text-pitch-950"
                  >
                    <td className="px-3 py-3 tabular-nums text-pitch-700">
                      {formatTransferDate(t.transferred_on)}
                    </td>
                    <td className="px-3 py-3">
                      <PlayerNameLink
                        name={t.player_out_name}
                        playerId={t.player_out_id}
                      />
                      {t.player_out_club ? (
                        <span className="mt-0.5 block text-xs text-pitch-600">
                          {t.player_out_club}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <PlayerNameLink
                        name={t.player_in_name}
                        playerId={t.player_in_id}
                      />
                      {t.player_in_club ? (
                        <span className="mt-0.5 block text-xs text-pitch-600">
                          {t.player_in_club}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-pitch-700">
                      {POSITION_LABEL[t.position]}
                      {t.pairing_ambiguous ? (
                        <span className="mt-0.5 block text-xs text-pitch-500">
                          Pairing approximate
                        </span>
                      ) : null}
                    </td>
                    <td
                      className={`px-3 py-3 text-right ${contributionClass(t.out_contribution)}`}
                    >
                      {formatContribution(t.out_contribution)}
                    </td>
                    <td
                      className={`px-3 py-3 text-right ${contributionClass(t.in_contribution)}`}
                    >
                      {formatContribution(t.in_contribution)}
                    </td>
                  </tr>
                ))}
                {snapshot.transfers.goalkeeper.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-pitch-200/80 text-pitch-950"
                  >
                    <td className="px-3 py-3 tabular-nums text-pitch-700">
                      {formatTransferDate(t.transferred_on)}
                    </td>
                    <td className="px-3 py-3 font-medium">{t.club_out_name}</td>
                    <td className="px-3 py-3 font-medium">{t.club_in_name}</td>
                    <td className="px-3 py-3 text-pitch-700">Goalkeeper</td>
                    <td
                      className={`px-3 py-3 text-right ${contributionClass(t.out_contribution)}`}
                    >
                      {formatContribution(t.out_contribution)}
                    </td>
                    <td
                      className={`px-3 py-3 text-right ${contributionClass(t.in_contribution)}`}
                    >
                      {formatContribution(t.in_contribution)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-pitch-600">
              Contribution is Dream League scoring while each asset was owned
              in this campaign (outfield goals; goalkeeper −concessions). Out
              and In are separate historic totals for that ownership spell —
              not alternative outcomes of the same move.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}