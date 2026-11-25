"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffectEvent } from "react";

import type { PlayerDirectoryTeamOption } from "@/lib/league/load-player-directory";
import type { PlayerPosition } from "@/types/database";

const POSITIONS: { value: PlayerPosition; label: string }[] = [
  { value: "DEF", label: "Defender" },
  { value: "MID", label: "Midfielder" },
  { value: "FWD", label: "Forward" },
];

export function PlayerDirectoryFilters({
  clubs,
  teams,
}: {
  clubs: string[];
  teams: PlayerDirectoryTeamOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useEffectEvent((form: HTMLFormElement) => {
    const data = new FormData(form);
    const next = new URLSearchParams();

    const position = String(data.get("position") ?? "");
    const club = String(data.get("club") ?? "");
    const team = String(data.get("team") ?? "");
    const goals = String(data.get("goals") ?? "");
    const sort = String(data.get("sort") ?? "name");

    if (position) next.set("position", position);
    if (club) next.set("club", club);
    if (team) next.set("team", team);
    if (goals !== "") next.set("goals", goals);
    if (sort && sort !== "name") next.set("sort", sort);

    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  });

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      onChange={(event) => {
        updateParams(event.currentTarget);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        updateParams(event.currentTarget);
      }}
    >
      <label className="flex min-w-[8rem] flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-pitch-600">
        Position
        <select
          name="position"
          defaultValue={searchParams.get("position") ?? ""}
          className="rounded border border-pitch-300 bg-white px-2 py-1.5 text-sm font-normal normal-case text-pitch-950"
        >
          <option value="">All</option>
          {POSITIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-[10rem] flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-pitch-600">
        Club
        <select
          name="club"
          defaultValue={searchParams.get("club") ?? ""}
          className="rounded border border-pitch-300 bg-white px-2 py-1.5 text-sm font-normal normal-case text-pitch-950"
        >
          <option value="">All</option>
          {clubs.map((club) => (
            <option key={club} value={club}>
              {club}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-[10rem] flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-pitch-600">
        Team
        <select
          name="team"
          defaultValue={searchParams.get("team") ?? ""}
          className="rounded border border-pitch-300 bg-white px-2 py-1.5 text-sm font-normal normal-case text-pitch-950"
        >
          <option value="">All</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-[7rem] flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-pitch-600">
        Goals
        <input
          name="goals"
          type="number"
          min={0}
          step={1}
          placeholder="Min"
          defaultValue={searchParams.get("goals") ?? ""}
          className="rounded border border-pitch-300 bg-white px-2 py-1.5 text-sm font-normal normal-case text-pitch-950"
        />
      </label>

      <label className="flex min-w-[10rem] flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-pitch-600">
        Sorting
        <select
          name="sort"
          defaultValue={searchParams.get("sort") ?? "name"}
          className="rounded border border-pitch-300 bg-white px-2 py-1.5 text-sm font-normal normal-case text-pitch-950"
        >
          <option value="name">Alphabetical</option>
          <option value="goals">Goals Scored</option>
        </select>
      </label>
    </form>
  );
}
