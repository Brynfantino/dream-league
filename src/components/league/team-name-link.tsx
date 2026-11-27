import Link from "next/link";

import { teamPageHref } from "@/lib/league/team-links";

type TeamNameLinkProps = {
  name: string;
  /** Active-season team id for Team Page. Null = no link (e.g. former franchise). */
  teamId: string | null | undefined;
  className?: string;
};

/**
 * Universal franchise navigation: team names link to Team Page when an
 * active-season team id is available.
 */
export function TeamNameLink({ name, teamId, className }: TeamNameLinkProps) {
  const base =
    className ?? "font-medium underline-offset-4 hover:underline";

  if (!teamId) {
    return <span className={className}>{name}</span>;
  }

  return (
    <Link href={teamPageHref(teamId)} className={base}>
      {name}
    </Link>
  );
}
