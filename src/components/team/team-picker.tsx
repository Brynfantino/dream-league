import Link from "next/link";

import type { TeamListItem } from "@/lib/league/load-team-page";

export function TeamPicker({
  teams,
  selectedId,
}: {
  teams: TeamListItem[];
  selectedId: string | null;
}) {
  if (teams.length === 0) {
    return (
      <p className="text-sm text-pitch-700">
        No teams in the active season yet.
      </p>
    );
  }

  return (
    <nav aria-label="Teams" className="flex flex-wrap gap-x-4 gap-y-2">
      {teams.map((team) => {
        const active = team.id === selectedId;
        return (
          <Link
            key={team.id}
            href={`/team-page?team=${team.id}`}
            className={`text-sm font-medium underline-offset-4 ${
              active
                ? "text-pitch-950 underline"
                : "text-pitch-700 hover:text-pitch-950 hover:underline"
            }`}
          >
            {team.name}
          </Link>
        );
      })}
    </nav>
  );
}
