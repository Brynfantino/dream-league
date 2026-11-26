/**
 * Read-only transfer usage (PRD §10).
 * Limits are not stored in the schema — use seasonal allocation constants.
 * Usage is derived from ownership stints: each membership acquired after the
 * season start date counts as one transfer-in (auction/opening squad does not).
 */

/** PRD §10: 8 outfield + 2 goalkeeper transfers per team per season. */
export const OUTFIELD_TRANSFER_LIMIT = 8;
export const GOALKEEPER_TRANSFER_LIMIT = 2;

export type TransferUsage = {
  outfield_used: number;
  outfield_remaining: number;
  outfield_limit: number;
  goalkeeper_used: number;
  goalkeeper_remaining: number;
  goalkeeper_limit: number;
};

export function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

/**
 * A stint is a transfer-in when acquired after the season start date.
 * Opening auction ownership uses acquired_at on (or before) starts_on.
 */
export function isTransferIn(
  acquiredAt: string,
  seasonStartsOn: string | null,
): boolean {
  if (!seasonStartsOn) {
    // Without starts_on we cannot separate auction from transfers safely.
    return false;
  }
  return toDateOnly(acquiredAt) > toDateOnly(seasonStartsOn);
}

export function countTransferIns(
  acquiredAts: string[],
  seasonStartsOn: string | null,
): number {
  let total = 0;
  for (const acquiredAt of acquiredAts) {
    if (isTransferIn(acquiredAt, seasonStartsOn)) total += 1;
  }
  return total;
}

export function deriveTransferUsage(
  outfieldAcquiredAts: string[],
  goalkeeperAcquiredAts: string[],
  seasonStartsOn: string | null,
): TransferUsage {
  const outfield_used = countTransferIns(outfieldAcquiredAts, seasonStartsOn);
  const goalkeeper_used = countTransferIns(
    goalkeeperAcquiredAts,
    seasonStartsOn,
  );

  return {
    outfield_used,
    outfield_remaining: Math.max(0, OUTFIELD_TRANSFER_LIMIT - outfield_used),
    outfield_limit: OUTFIELD_TRANSFER_LIMIT,
    goalkeeper_used,
    goalkeeper_remaining: Math.max(
      0,
      GOALKEEPER_TRANSFER_LIMIT - goalkeeper_used,
    ),
    goalkeeper_limit: GOALKEEPER_TRANSFER_LIMIT,
  };
}
