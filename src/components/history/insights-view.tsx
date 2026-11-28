import { PlayerNameLink } from "@/components/league/player-name-link";
import { TeamNameLink } from "@/components/league/team-name-link";
import type {
  InsightCard,
  InsightGroup,
  InsightSubject,
  InsightsPageData,
} from "@/lib/league/insights-shared";

function SubjectName({
  subject,
  className,
}: {
  subject: InsightSubject;
  className?: string;
}) {
  const base =
    className ??
    "font-display text-xl tracking-wide text-pitch-950 underline-offset-4 hover:underline sm:text-2xl";

  if (subject.player_id) {
    return (
      <PlayerNameLink
        name={subject.name}
        playerId={subject.player_id}
        className={base}
      />
    );
  }

  if (subject.is_team) {
    return (
      <TeamNameLink
        name={subject.name}
        teamId={subject.link_team_id}
        className={base}
      />
    );
  }

  return <span className={base.replace(" hover:underline", "")}>{subject.name}</span>;
}

function SubjectBlock({ subject }: { subject: InsightSubject }) {
  return (
    <div>
      <SubjectName subject={subject} />
      {subject.context ? (
        <p className="mt-0.5 text-sm text-pitch-700">
          {subject.context_link_team_id ? (
            <TeamNameLink
              name={subject.context}
              teamId={subject.context_link_team_id}
              className="underline-offset-2 hover:underline"
            />
          ) : (
            subject.context
          )}
        </p>
      ) : null}
    </div>
  );
}

function InsightFactCard({ card }: { card: InsightCard }) {
  const joint = card.subjects.length > 1;

  return (
    <article
      className="flex flex-col border border-pitch-300 bg-gradient-to-br from-pitch-50 via-white to-pitch-100/80 p-5 sm:p-6"
      aria-labelledby={`insight-${card.id}`}
    >
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-pitch-600">
        Insight
      </p>
      <h4
        id={`insight-${card.id}`}
        className="mt-1 font-display text-lg tracking-wide text-pitch-900 sm:text-xl"
      >
        {card.title}
      </h4>
      {card.blurb ? (
        <p className="mt-1 text-xs text-pitch-600">{card.blurb}</p>
      ) : null}

      <p className="mt-5 font-display text-3xl tracking-wide tabular-nums text-pitch-950 sm:text-4xl">
        {card.value_label}
      </p>

      <div className="mt-3 space-y-2">
        {joint ? (
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-pitch-500">
            Tied
          </p>
        ) : null}
        {card.subjects.map((subject, index) => (
          <SubjectBlock
            key={`${subject.name}-${subject.context ?? ""}-${index}`}
            subject={subject}
          />
        ))}
      </div>

      {card.runners_up && card.runners_up.length > 0 ? (
        <div className="mt-5 border-t border-pitch-200 pt-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-pitch-500">
            Also notable
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-pitch-800">
            {card.runners_up.map((row, index) => (
              <li
                key={`${row.subject.name}-${index}`}
                className="flex flex-wrap items-baseline justify-between gap-2"
              >
                <span className="min-w-0">
                  <SubjectName
                    subject={row.subject}
                    className="font-medium text-pitch-950 underline-offset-2 hover:underline"
                  />
                  {row.subject.context ? (
                    <span className="text-pitch-600">
                      {" "}
                      · {row.subject.context}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 tabular-nums text-pitch-600">
                  {row.value_label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function InsightGroupBlock({ group }: { group: InsightGroup }) {
  return (
    <section className="space-y-4" aria-labelledby={`insight-group-${group.id}`}>
      <h3
        id={`insight-group-${group.id}`}
        className="font-display text-xl tracking-wide text-pitch-800 sm:text-2xl"
      >
        {group.title}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {group.cards.map((card) => (
          <InsightFactCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}

export function InsightsView({ data }: { data: InsightsPageData }) {
  if (data.groups.length === 0) {
    return (
      <p className="text-sm text-pitch-700">
        No insights could be derived from the imported seasons yet.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <p className="text-sm text-pitch-800">
        Interesting facts about Dream League history — browse for the things
        you didn&apos;t know.
      </p>
      {data.note ? (
        <p className="text-xs text-pitch-600">{data.note}</p>
      ) : null}
      {data.groups.map((group) => (
        <InsightGroupBlock key={group.id} group={group} />
      ))}
    </div>
  );
}
