/** Player Profile deep link (entry via any `players.id` for that footballer). */
export function playerPageHref(playerId: string): string {
  return `/player-page?player=${encodeURIComponent(playerId)}`;
}
