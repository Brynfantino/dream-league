import type { ReactNode } from "react";

import { PlayerNameLink } from "@/components/league/player-name-link";
import { TeamNameLink } from "@/components/league/team-name-link";
import type {
  RecordEntry,
  RecordHolder,
  RecordsPageData,
  RecordsSection,
} from "@/lib/league/records-shared";

function HolderName({ holder }: { holder: RecordHolder }) {
  if (holder.kind === "player") {
    return (
      <PlayerNameLink
        name={holder.name}
        playerId={holder.player_id}
        className="font-display text-xl tracking-wide text-pitch-950 underline-offset-4 hover:underline sm:text-2xl"
      />
    );
  }

  if (holder.kind === "team") {
    return (
      <TeamNameLink
        name={holder.name}
        teamId={holder.link_team_id}
        className="font-display text-xl tracking-wide text-pitch-950 underline-offset-4 hover:underline sm:text-2xl"
      />
    );
  }

  // Goalkeeper clubs have no profile page yet.
  return (
    <span className="font-display text-xl tracking-wide text-pitch-950 sm:text-2xl">
      {holder.name}
    </span>
  );
}

function HolderContext({ holder }: { holder: RecordHolder }) {
  const parts: ReactNode[] = [];

  if (holder.team_name && holder.kind !== "team") {
    parts.push(
      <TeamNameLink
        key="team"
        name={holder.team_name}
        teamId={holder.link_team_id}
        className="underline-offset-2 hover:underline"
      />,
    );
  }

  if (holder.season_name) {
    parts.push(
      <span key="season" className="text-pitch-700">
        {holder.season_name}
      </span>,
    );
  }

  if (parts.length === 0) return null;

  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-pitch-700">
      {parts.map((part, index) => (
        <span key={index} className="inline-flex items-center gap-2">
          {index > 0 ? (
            <span className="text-pitch-400" aria-hidden>
              ·
            </span>
          ) : null}
          {part}
        </span>
      ))}
    </p>
  );
}

function RecordCard({ record }: { record: RecordEntry }) {
  const joint = record.holders.length > 1;

  return (
    <article
      className="flex flex-col border border-pitch-300 bg-gradient-to-br from-pitch-50 via-white to-pitch-100/80 p-5 sm:p-6"
      aria-labelledby={`record-${record.id}`}
    >
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-pitch-600">
        Record
      </p>
      <h4
        id={`record-${record.id}`}
        className="mt-1 font-display text-lg tracking-wide text-pitch-900 sm:text-xl"
      >
        {record.title}
      </h4>
      {record.description ? (
        <p className="mt-1 text-xs text-pitch-600">{record.description}</p>
      ) : null}

      <div className="mt-5 space-y-4">
        {record.holders.map((holder, index) => (
          <div
            key={`${holder.name}-${holder.season_name ?? ""}-${index}`}
            className={
              index > 0 ? "border-t border-pitch-200 pt-4" : undefined
            }
          >
            {joint && index === 0 ? (
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-pitch-500">
                Joint holders
              </p>
            ) : null}
            <p className="font-display text-3xl tracking-wide tabular-nums text-pitch-950 sm:text-4xl">
              {holder.value_label}
            </p>
            <div className="mt-2">
              <HolderName holder={holder} />
              <HolderContext holder={holder} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function RecordsSectionBlock({ section }: { section: RecordsSection }) {
  return (
    <section className="space-y-8" aria-labelledby={`section-${section.id}`}>
      <header className="border-b border-pitch-300 pb-3">
        <h2
          id={`section-${section.id}`}
          className="font-display text-3xl tracking-wide text-pitch-950 sm:text-4xl"
        >
          {section.title}
        </h2>
      </header>

      {section.groups.map((group) => (
        <div key={group.id} className="space-y-4" aria-labelledby={`group-${group.id}`}>
          <h3
            id={`group-${group.id}`}
            className="font-display text-xl tracking-wide text-pitch-800 sm:text-2xl"
          >
            {group.title}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.records.map((record) => (
              <RecordCard key={record.id} record={record} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function RecordsView({ data }: { data: RecordsPageData }) {
  if (data.sections.length === 0) {
    return (
      <p className="text-sm text-pitch-700">
        No records could be derived from the imported seasons yet.
      </p>
    );
  }

  return (
    <div className="space-y-12">
      {data.season_scope_note ? (
        <p className="text-sm text-pitch-700">{data.season_scope_note}</p>
      ) : null}

      {data.sections.map((section) => (
        <RecordsSectionBlock key={section.id} section={section} />
      ))}
    </div>
  );
}
