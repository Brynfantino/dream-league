import Link from "next/link";

import { PlayerNameLink } from "@/components/league/player-name-link";
import type {
  DerivedGoalkeeperTransfer,
  DerivedOutfieldTransfer,
} from "@/lib/league/derive-transfers";
import type { TransferCentreTeamCount } from "@/lib/league/load-transfer-centre";
import type { PlayerPosition } from "@/types/database";

const POSITION_LABEL: Record<PlayerPosition, string> = {
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function TransferCentreView({
  seasonName,
  outfieldTransfers,
  goalkeeperTransfers,
  teamCounts,
}: {
  seasonName: string;
  outfieldTransfers: DerivedOutfieldTransfer[];
  goalkeeperTransfers: DerivedGoalkeeperTransfer[];
  teamCounts: TransferCentreTeamCount[];
}) {
  const totalTransfers = outfieldTransfers.length + goalkeeperTransfers.length;
  const ambiguousCount =
    outfieldTransfers.filter((t) => t.pairing_ambiguous).length +
    goalkeeperTransfers.filter((t) => t.pairing_ambiguous).length;

  return (
    <div className="space-y-10">
      <p className="text-sm text-pitch-700">
        Active season: {seasonName} · {totalTransfers} transfer
        {totalTransfers === 1 ? "" : "s"} derived from ownership history
        {ambiguousCount > 0
          ? ` · ${ambiguousCount} same-day multi-swap row${ambiguousCount === 1 ? "" : "s"} paired by name`
          : ""}
      </p>

      <section className="space-y-3" aria-labelledby="transfer-counts">
        <h2
          id="transfer-counts"
          className="font-display text-xl tracking-wide text-pitch-950"
        >
          Transfer Counts by Team
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <caption className="sr-only">
              Outfield and goalkeeper transfers used and remaining by team
            </caption>
            <thead>
              <tr className="border-b border-pitch-300 text-pitch-800">
                <th scope="col" className="px-3 py-3 font-semibold">
                  Team
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-right font-semibold"
                >
                  Outfield Used
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-right font-semibold"
                >
                  Outfield Remaining
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-right font-semibold"
                >
                  GK Used
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-right font-semibold"
                >
                  GK Remaining
                </th>
              </tr>
            </thead>
            <tbody>
              {teamCounts.map((row) => (
                <tr
                  key={row.team_id}
                  className="border-b border-pitch-200/80 text-pitch-950 last:border-0"
                >
                  <td className="px-3 py-3 font-medium">
                    <Link
                      href={`/team-page?team=${row.team_id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {row.team_name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {row.usage.outfield_used}
                    <span className="text-pitch-600">
                      {" "}
                      / {row.usage.outfield_limit}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {row.usage.outfield_remaining}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {row.usage.goalkeeper_used}
                    <span className="text-pitch-600">
                      {" "}
                      / {row.usage.goalkeeper_limit}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {row.usage.goalkeeper_remaining}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="outfield-transfers">
        <h2
          id="outfield-transfers"
          className="font-display text-xl tracking-wide text-pitch-950"
        >
          Outfield Transfers
        </h2>
        {outfieldTransfers.length === 0 ? (
          <p className="text-sm text-pitch-700">
            No outfield transfers derived for this season yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Outfield transfers with date, team, player out, and player in
              </caption>
              <thead>
                <tr className="border-b border-pitch-300 text-pitch-800">
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Date
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Team
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Position
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Player Out
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Player In
                  </th>
                </tr>
              </thead>
              <tbody>
                {outfieldTransfers.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-pitch-200/80 text-pitch-950 last:border-0"
                  >
                    <td className="px-3 py-3 tabular-nums text-pitch-700">
                      {formatDate(row.transferred_on)}
                      {row.pairing_ambiguous ? (
                        <span className="mt-0.5 block text-xs text-pitch-600">
                          Same-day multi-swap
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 font-medium">
                      <Link
                        href={`/team-page?team=${row.team_id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {row.team_name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-pitch-700">
                      {POSITION_LABEL[row.position]}
                    </td>
                    <td className="px-3 py-3">
                      <PlayerNameLink
                        name={row.player_out_name}
                        playerId={row.player_out_id}
                      />
                      {row.player_out_club ? (
                        <span className="mt-0.5 block text-xs text-pitch-600">
                          {row.player_out_club}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <PlayerNameLink
                        name={row.player_in_name}
                        playerId={row.player_in_id}
                      />
                      {row.player_in_club ? (
                        <span className="mt-0.5 block text-xs text-pitch-600">
                          {row.player_in_club}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="gk-transfers">
        <h2
          id="gk-transfers"
          className="font-display text-xl tracking-wide text-pitch-950"
        >
          Goalkeeper Transfers
        </h2>
        {goalkeeperTransfers.length === 0 ? (
          <p className="text-sm text-pitch-700">
            No goalkeeper transfers derived for this season yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Goalkeeper club transfers with date, team, club out, and club in
              </caption>
              <thead>
                <tr className="border-b border-pitch-300 text-pitch-800">
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Date
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Team
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Club Out
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Club In
                  </th>
                </tr>
              </thead>
              <tbody>
                {goalkeeperTransfers.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-pitch-200/80 text-pitch-950 last:border-0"
                  >
                    <td className="px-3 py-3 tabular-nums text-pitch-700">
                      {formatDate(row.transferred_on)}
                      {row.pairing_ambiguous ? (
                        <span className="mt-0.5 block text-xs text-pitch-600">
                          Same-day multi-swap
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 font-medium">
                      <Link
                        href={`/team-page?team=${row.team_id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {row.team_name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 font-medium">
                      {row.club_out_name}
                    </td>
                    <td className="px-3 py-3 font-medium">
                      {row.club_in_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
