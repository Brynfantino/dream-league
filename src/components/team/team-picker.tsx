"use client";

import { useRouter } from "next/navigation";
import { useEffectEvent } from "react";

import type { TeamListItem } from "@/lib/league/load-team-page";

export function TeamPicker({
  teams,
  selectedId,
}: {
  teams: TeamListItem[];
  selectedId: string | null;
}) {
  const router = useRouter();

  const onTeamChange = useEffectEvent((teamId: string) => {
    if (!teamId) {
      router.replace("/team-page");
      return;
    }
    router.replace(`/team-page?team=${teamId}`);
  });

  if (teams.length === 0) {
    return (
      <p className="text-sm text-pitch-700">
        No teams in the active season yet.
      </p>
    );
  }

  return (
    <label className="flex max-w-sm flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-pitch-600">
      Team
      <select
        name="team"
        value={selectedId ?? ""}
        onChange={(event) => onTeamChange(event.target.value)}
        className="rounded border border-pitch-300 bg-white px-2 py-1.5 text-sm font-normal normal-case text-pitch-950"
        aria-label="Select team"
      >
        <option value="">Select a team…</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </label>
  );
}
