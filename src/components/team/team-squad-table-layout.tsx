import { formatContribution } from "@/lib/league/team-detail";

/**
 * Shared grid for Current Squad and Team History tables.
 * Position / Name / Club / Contribution use identical fixed widths so the
 * History "Current Owner" column can extend to the right without shifting
 * the shared columns.
 */

export const TEAM_SQUAD_COL = {
  position: "9rem",
  name: "14rem",
  club: "14rem",
  contribution: "7rem",
  currentOwner: "12rem",
} as const;

/** Both tables use this full grid width (shared cols + Current Owner slot). */
export const TEAM_HISTORY_TABLE_WIDTH = `${9 + 14 + 14 + 7 + 12}rem`;

export const TEAM_SQUAD_TABLE_CLASS =
  "table-fixed border-collapse text-left text-sm";

export function TeamSquadColGroup({
  withCurrentOwner = false,
}: {
  withCurrentOwner?: boolean;
}) {
  return (
    <colgroup>
      <col style={{ width: TEAM_SQUAD_COL.position }} />
      <col style={{ width: TEAM_SQUAD_COL.name }} />
      <col style={{ width: TEAM_SQUAD_COL.club }} />
      <col style={{ width: TEAM_SQUAD_COL.contribution }} />
      {withCurrentOwner ? (
        <col style={{ width: TEAM_SQUAD_COL.currentOwner }} />
      ) : null}
    </colgroup>
  );
}

export function contributionClass(value: number): string {
  if (value > 0) return "font-semibold tabular-nums text-pitch-700";
  if (value < 0) return "font-semibold tabular-nums text-red-800";
  return "tabular-nums text-pitch-600";
}

export function ContributionCell({ value }: { value: number }) {
  return (
    <td className={`px-3 py-3 text-right ${contributionClass(value)}`}>
      {formatContribution(value)}
    </td>
  );
}
