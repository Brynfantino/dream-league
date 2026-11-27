import Image from "next/image";

import { TeamNameLink } from "@/components/league/team-name-link";
import type { PlayerPageDetail } from "@/lib/league/load-player-page";
import type { PlayerPosition } from "@/types/database";

const POSITION_LABEL: Record<PlayerPosition, string> = {
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  // Date-only (season ends_on) — format in UTC to avoid day shifts.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function PlayerProfileView({ detail }: { detail: PlayerPageDetail }) {
  const positionLabels = detail.positions
    .map((p) => POSITION_LABEL[p])
    .join(" · ");

  return (
    <div className="space-y-10">
      <section
        className="flex flex-col gap-6 sm:flex-row sm:items-start"
        aria-labelledby="player-profile-heading"
      >
        <div className="relative h-40 w-40 shrink-0 overflow-hidden border border-pitch-300 bg-pitch-100 sm:h-48 sm:w-48">
          {detail.photo_url ? (
            <Image
              src={detail.photo_url}
              alt=""
              fill
              className="object-cover"
              sizes="192px"
            />
          ) : (
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-pitch-200 via-pitch-100 to-pitch-300"
              aria-hidden
            >
              <span className="font-display text-4xl tracking-wide text-pitch-800">
                {initials(detail.name)}
              </span>
              <span className="text-[0.65rem] uppercase tracking-[0.18em] text-pitch-600">
                Photo soon
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-1">
            <h2
              id="player-profile-heading"
              className="font-display text-3xl tracking-wide text-pitch-950 sm:text-4xl"
            >
              {detail.name}
            </h2>
            <p className="text-sm text-pitch-700">
              {positionLabels || "Position unknown"}
              {detail.current_club ? ` · ${detail.current_club}` : null}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div className="border-t border-pitch-300 pt-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
                Career goals
              </dt>
              <dd className="mt-1 font-display text-2xl tracking-wide tabular-nums text-pitch-950">
                {detail.career_goals}
              </dd>
            </div>
            <div className="border-t border-pitch-300 pt-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
                League titles
              </dt>
              <dd className="mt-1 font-display text-2xl tracking-wide tabular-nums text-pitch-950">
                {detail.league_titles}
              </dd>
            </div>
            <div className="border-t border-pitch-300 pt-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
                Cup titles
              </dt>
              <dd className="mt-1 font-display text-2xl tracking-wide tabular-nums text-pitch-950">
                {detail.cup_titles}
              </dd>
            </div>
            <div className="border-t border-pitch-300 pt-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
                Current club
              </dt>
              <dd className="mt-1 text-base font-medium text-pitch-950">
                {detail.current_club ?? "—"}
              </dd>
            </div>
            <div className="border-t border-pitch-300 pt-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-pitch-600">
                Dream League team
              </dt>
              <dd className="mt-1 text-base font-medium text-pitch-950">
                {detail.current_team_name ? (
                  <TeamNameLink
                    name={detail.current_team_name}
                    teamId={detail.current_team_link_id}
                  />
                ) : (
                  "Not currently owned"
                )}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="club-career">
        <div className="space-y-1 border-t border-pitch-300 pt-8">
          <h3
            id="club-career"
            className="font-display text-xl tracking-wide text-pitch-950"
          >
            Club career
          </h3>
          <p className="text-sm text-pitch-700">
            Real-life clubs recorded in Dream League, with goals scored while
            that club row was owned.
          </p>
        </div>

        {detail.club_career.length === 0 ? (
          <p className="text-sm text-pitch-700">No club records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Club career with club, position, seasons, and Dream League goals
              </caption>
              <thead>
                <tr className="border-b border-pitch-300 text-pitch-800">
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Club
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Position
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Seasons
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    Goals
                  </th>
                </tr>
              </thead>
              <tbody>
                {detail.club_career.map((row) => (
                  <tr
                    key={row.player_id}
                    className="border-b border-pitch-200/80 text-pitch-950 last:border-0"
                  >
                    <td className="px-3 py-3 font-medium">
                      {row.club ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-pitch-700">
                      {row.positions.map((p) => POSITION_LABEL[p]).join(", ")}
                    </td>
                    <td className="px-3 py-3 text-pitch-700">
                      {row.seasons.length > 0 ? row.seasons.join(", ") : "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.dream_league_goals}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="ownership-history">
        <div className="space-y-1 border-t border-pitch-300 pt-8">
          <h3
            id="ownership-history"
            className="font-display text-xl tracking-wide text-pitch-950"
          >
            Ownership history
          </h3>
          <p className="text-sm text-pitch-700">
            Dream League teams that owned this player, with goals while owned.
          </p>
        </div>

        {detail.ownership_history.length === 0 ? (
          <p className="text-sm text-pitch-700">No ownership records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Ownership history with season, team, club, dates, and goals
              </caption>
              <thead>
                <tr className="border-b border-pitch-300 text-pitch-800">
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Season
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Team
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Club
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Position
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Owned
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    Goals
                  </th>
                </tr>
              </thead>
              <tbody>
                {detail.ownership_history.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-pitch-200/80 text-pitch-950 last:border-0"
                  >
                    <td className="px-3 py-3 tabular-nums text-pitch-700">
                      {row.season_name}
                      {row.is_current ? (
                        <span className="mt-0.5 block text-xs text-pitch-600">
                          Current
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 font-medium">
                      <TeamNameLink
                        name={row.team_name}
                        teamId={row.link_team_id}
                      />
                    </td>
                    <td className="px-3 py-3 text-pitch-700">
                      {row.club ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-pitch-700">
                      {POSITION_LABEL[row.position]}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-pitch-700">
                      {formatDate(row.acquired_at)}
                      {" → "}
                      {row.owned_until
                        ? formatDate(row.owned_until)
                        : "present"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.goals_while_owned}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-pitch-600">{detail.identity_note}</p>
    </div>
  );
}
