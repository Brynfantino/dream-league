import Link from "next/link";

import { playerPageHref } from "@/lib/league/player-links";

type PlayerNameLinkProps = {
  name: string;
  playerId: string | null | undefined;
  className?: string;
};

/**
 * Player names link to Player Profile when a players.id is available.
 */
export function PlayerNameLink({
  name,
  playerId,
  className,
}: PlayerNameLinkProps) {
  const base =
    className ?? "font-medium underline-offset-4 hover:underline";

  if (!playerId) {
    return <span className={className}>{name}</span>;
  }

  return (
    <Link href={playerPageHref(playerId)} className={base}>
      {name}
    </Link>
  );
}
