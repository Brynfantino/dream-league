import type { ReactNode } from "react";

import { PlayerNameLink } from "@/components/league/player-name-link";
import { TeamNameLink } from "@/components/league/team-name-link";
import type {
  RecordEntry,
  RecordHolder,
  RecordsPageData,
  RecordsSection,
} from "@/lib/league/records-shared";

/** Show the first N holders inline; more go behind a disclosure. */
const INLINE_HOLDER_LIMIT = 3;

function HolderName({
  holder,
  className,
}: {
  holder: RecordHolder;
  className?: string;
}) {
  const base =
    className ??
    "font-medium text-pitch-950 underline-offset-2 hover:underline";

  if (holder.kind === "player") {
    return (
      <PlayerNameLink
        name={holder.name}
        playerId={holder.player_id}
        className={base}
      />
    );
  }

  if (holder.kind === "team") {
    return (
      <TeamNameLink
        name={holder.name}
        teamId={holder.link_team_id}
        className={base}
      />
    );
  }

  return <span className={base}>{holder.name}</span>;
}

function holderMeta(holder: RecordHolder): ReactNode {
  const bits: ReactNode[] = [];

  if (holder.team_name && holder.kind !== "team") {
    bits.push(
      <TeamNameLink
        key="team"
        name={holder.team_name}
        teamId={holder.link_team_id}
        className="underline-offset-2 hover:underline"
      />,
    );
  }

  if (holder.season_name) {
    bits.push(
      <span key="season" className="text-pitch-600">
        {holder.season_name}
      </span>,
    );
  }

  if (bits.length === 0) return null;

  return (
    <span className="text-pitch-600">
      {" "}
      (
      {bits.map((bit, index) => (
        <span key={index}>
          {index > 0 ? ", " : null}
          {bit}
        </span>
      ))}
      )
    </span>
  );
}

function entityWord(holders: RecordHolder[]): string {
  const kind = holders[0]?.kind;
  if (kind === "player") {
    return holders.length === 1 ? "player" : "players";
  }
  if (kind === "goalkeeper_club") {
    return holders.length === 1 ? "club" : "clubs";
  }
  return holders.length === 1 ? "franchise" : "franchises";
}

function CompactHolderList({ holders }: { holders: RecordHolder[] }) {
  return (
    <ul className="mt-1 columns-1 gap-x-6 text-sm text-pitch-800 sm:columns-2">
      {holders.map((holder, index) => (
        <li
          key={`${holder.name}-${holder.season_name ?? ""}-${index}`}
          className="break-inside-avoid py-0.5"
        >
          <HolderName holder={holder} />
          {holderMeta(holder)}
        </li>
      ))}
    </ul>
  );
}

function HoldersBlock({ holders }: { holders: RecordHolder[] }) {
  if (holders.length === 0) return null;

  if (holders.length === 1) {
    const holder = holders[0]!;
    return (
      <p className="mt-2 text-sm text-pitch-800">
        <HolderName
          holder={holder}
          className="font-display text-base tracking-wide text-pitch-950 underline-offset-2 hover:underline sm:text-lg"
        />
        {holderMeta(holder)}
      </p>
    );
  }

  const inline = holders.slice(0, INLINE_HOLDER_LIMIT);
  const overflow = holders.slice(INLINE_HOLDER_LIMIT);

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-pitch-500">
        Tied · {holders.length} {entityWord(holders)}
      </p>
      <p className="text-sm leading-relaxed text-pitch-800">
        {inline.map((holder, index) => (
          <span key={`${holder.name}-${index}`}>
            {index > 0 ? (
              <span className="text-pitch-400"> · </span>
            ) : null}
            <HolderName holder={holder} />
            {holderMeta(holder)}
          </span>
        ))}
        {overflow.length > 0 ? (
          <span className="text-pitch-500">
            {" "}
            · +{overflow.length} more
          </span>
        ) : null}
      </p>
      {overflow.length > 0 ? (
        <details className="group text-sm">
          <summary className="cursor-pointer select-none text-pitch-700 underline-offset-2 hover:underline">
            Show all {holders.length} {entityWord(holders)}
          </summary>
          <CompactHolderList holders={holders} />
        </details>
      ) : null}
    </div>
  );
}

function RecordRow({ record }: { record: RecordEntry }) {
  const valueLabel = record.holders[0]?.value_label ?? "—";

  return (
    <article
      className="grid gap-3 border-b border-pitch-200 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-6"
      aria-labelledby={`record-${record.id}`}
    >
      <div className="min-w-0">
        <h4
          id={`record-${record.id}`}
          className="font-display text-lg tracking-wide text-pitch-900 sm:text-xl"
        >
          {record.title}
        </h4>
        {record.description ? (
          <p className="mt-0.5 text-xs text-pitch-600">{record.description}</p>
        ) : null}
        <HoldersBlock holders={record.holders} />
      </div>

      <p
        className="font-display text-3xl tracking-wide tabular-nums text-pitch-950 sm:pt-0.5 sm:text-right sm:text-4xl"
        aria-label={`Record value ${valueLabel}`}
      >
        {valueLabel}
      </p>
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
        <div
          key={group.id}
          className="space-y-1"
          aria-labelledby={`group-${group.id}`}
        >
          <h3
            id={`group-${group.id}`}
            className="font-display text-xl tracking-wide text-pitch-800 sm:text-2xl"
          >
            {group.title}
          </h3>
          <div className="border-t border-pitch-300">
            {group.records.map((record) => (
              <RecordRow key={record.id} record={record} />
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
