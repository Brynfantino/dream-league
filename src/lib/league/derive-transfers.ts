import { toDateOnly } from "@/lib/league/transfer-usage";
import type { PlayerPosition } from "@/types/database";

/**
 * Derive read-only transfer activity from ownership stints (active season).
 * Heuristic (PRD §10 same-position replace): for one team + position, match
 * released_at date to acquired_at date → OUT → IN.
 * Not the `transfers` proposal table (unseeded); labelled as derived.
 */

export type OutfieldStintSeed = {
  team_id: string;
  player_id: string;
  player_name: string;
  club: string | null;
  position: PlayerPosition;
  acquired_at: string;
  released_at: string | null;
};

export type GoalkeeperStintSeed = {
  team_id: string;
  goalkeeper_club_id: string;
  club_name: string;
  acquired_at: string;
  released_at: string | null;
};

export type DerivedOutfieldTransfer = {
  id: string;
  team_id: string;
  team_name: string;
  transferred_on: string;
  position: PlayerPosition;
  player_out_id: string;
  player_out_name: string;
  player_out_club: string | null;
  player_in_id: string;
  player_in_name: string;
  player_in_club: string | null;
  /** True when multiple same-day same-position swaps were name-sorted to pair. */
  pairing_ambiguous: boolean;
};

export type DerivedGoalkeeperTransfer = {
  id: string;
  team_id: string;
  team_name: string;
  transferred_on: string;
  club_out_id: string;
  club_out_name: string;
  club_in_id: string;
  club_in_name: string;
  pairing_ambiguous: boolean;
};

type NamedLeg = {
  id: string;
  name: string;
  club: string | null;
  date: string;
};

/** Bryn-approved OUT→IN for same-day multi-swaps (spreadsheet row adjacency). */
export type ApprovedOutfieldPairing = {
  team_name: string;
  position: PlayerPosition;
  transferred_on: string;
  player_out_name: string;
  player_in_name: string;
};

export const APPROVED_OUTFIELD_PAIRINGS: ApprovedOutfieldPairing[] = [
  // CF Cala Alcaufar — MID — 27 Aug 2026
  {
    team_name: "CF CALA ALCAUFAR",
    position: "MID",
    transferred_on: "2026-08-27",
    player_out_name: "FINN AZAZ",
    player_in_name: "OMAR MARMOUSH",
  },
  {
    team_name: "CF CALA ALCAUFAR",
    position: "MID",
    transferred_on: "2026-08-27",
    player_out_name: "OLIVER NORWOOD",
    player_in_name: "LEO SCIENZA",
  },
  // Newell's Old Tiki Taka — FWD — 3 Sep 2026
  {
    team_name: "NEWELL'S OLD TIKI TAKA",
    position: "FWD",
    transferred_on: "2026-09-03",
    player_out_name: "CONOR CHAPLIN",
    player_in_name: "EMIL RIIS",
  },
  {
    team_name: "NEWELL'S OLD TIKI TAKA",
    position: "FWD",
    transferred_on: "2026-09-03",
    player_out_name: "MO FAAL",
    player_in_name: "YUSUF AKHAMRICH",
  },
  // Atletico Dec — FWD — 3 Sep 2026
  {
    team_name: "ATLETICO DEC",
    position: "FWD",
    transferred_on: "2026-09-03",
    player_out_name: "JEAN-PHILIPPE MATETA",
    player_in_name: "YOANNE WISSA",
  },
  {
    team_name: "ATLETICO DEC",
    position: "FWD",
    transferred_on: "2026-09-03",
    player_out_name: "MASON BURSTOW",
    player_in_name: "DANE SCARLETT",
  },
  // Atletico Dec — FWD — 29 Oct 2026
  {
    team_name: "ATLETICO DEC",
    position: "FWD",
    transferred_on: "2026-10-29",
    player_out_name: "YOANNE WISSA",
    player_in_name: "EVANILSON",
  },
  {
    team_name: "ATLETICO DEC",
    position: "FWD",
    transferred_on: "2026-10-29",
    player_out_name: "JOSH COBURN",
    player_in_name: "DERENSILI SANCHES FERNANDES",
  },
  // --- 2025/26 historical (Bryn approved 2026-11-27) ---
  // Sporting Hoof — FWD — 21 Aug 2025
  {
    team_name: "SPORTING HOOF",
    position: "FWD",
    transferred_on: "2025-08-21",
    player_out_name: "HARRY SMITH",
    player_in_name: "JAMES COLLINS",
  },
  {
    team_name: "SPORTING HOOF",
    position: "FWD",
    transferred_on: "2025-08-21",
    player_out_name: "SAM NOMBE",
    player_in_name: "JAMIE REID",
  },
  // Naths Rovers — FWD — 4 Sep 2025
  {
    team_name: "NATHS ROVERS",
    position: "FWD",
    transferred_on: "2025-09-04",
    player_out_name: "MIHAILO IVANOVIC",
    player_in_name: "RANDOL KOLO MUANI",
  },
  {
    team_name: "NATHS ROVERS",
    position: "FWD",
    transferred_on: "2025-09-04",
    player_out_name: "RODRIGO MUNIZ",
    player_in_name: "MATT DENNIS",
  },
  // Erimus — FWD — 23 Oct 2025
  {
    team_name: "ERIMUS",
    position: "FWD",
    transferred_on: "2025-10-23",
    player_out_name: "CALLUM LANG",
    player_in_name: "ANTONI SARCEVIC",
  },
  {
    team_name: "ERIMUS",
    position: "FWD",
    transferred_on: "2025-10-23",
    player_out_name: "CHUBA AKPOM",
    player_in_name: "MILUTIN OSMAJIC",
  },
  // Erimus — FWD — 1 Jan 2026
  {
    team_name: "ERIMUS",
    position: "FWD",
    transferred_on: "2026-01-01",
    player_out_name: "ALEKSANDER ISAK",
    player_in_name: "JOVON MAKAMA",
  },
  {
    team_name: "ERIMUS",
    position: "FWD",
    transferred_on: "2026-01-01",
    player_out_name: "MILLENIC ALLI",
    player_in_name: "RYAN GRAYDON",
  },
  // Naths Rovers — FWD — 29 Jan 2026
  {
    team_name: "NATHS ROVERS",
    position: "FWD",
    transferred_on: "2026-01-29",
    player_out_name: "BENJAMIN SESKO",
    player_in_name: "JACK CLARKE",
  },
  {
    team_name: "NATHS ROVERS",
    position: "FWD",
    transferred_on: "2026-01-29",
    player_out_name: "RANDOL KOLO MUANI",
    player_in_name: "KIEFFER MOORE",
  },
  {
    team_name: "NATHS ROVERS",
    position: "FWD",
    transferred_on: "2026-01-29",
    player_out_name: "MATT DENNIS",
    player_in_name: "JAYDEN WAREHAM",
  },
  // Dreamers Dregs — FWD — 19 Feb 2026
  {
    team_name: "DREAMERS DREGS",
    position: "FWD",
    transferred_on: "2026-02-19",
    player_out_name: "MIKE FONDOP",
    player_in_name: "MARCUS BROWNE",
  },
  {
    team_name: "DREAMERS DREGS",
    position: "FWD",
    transferred_on: "2026-02-19",
    player_out_name: "WILL GRIGG",
    player_in_name: "KIEFFER MOORE",
  },
  // Atletico Dec — FWD — 5 Mar 2026
  {
    team_name: "ATLETICO DEC",
    position: "FWD",
    transferred_on: "2026-03-05",
    player_out_name: "ALFIE MAY",
    player_in_name: "EVANN GUESSAND",
  },
  {
    team_name: "ATLETICO DEC",
    position: "FWD",
    transferred_on: "2026-03-05",
    player_out_name: "AUNE HEGGEBO",
    player_in_name: "ROB STREET",
  },
  // Le Harpre — FWD — 26 Mar 2026
  {
    team_name: "LE HARPRE",
    position: "FWD",
    transferred_on: "2026-03-26",
    player_out_name: "KYOGO FURUHASHI",
    player_in_name: "BENJAMIN SESKO",
  },
  {
    team_name: "LE HARPRE",
    position: "FWD",
    transferred_on: "2026-03-26",
    player_out_name: "NATHANIEL MENDEZ-LAING",
    player_in_name: "MIKE FONDOP",
  },
];

function normName(name: string): string {
  return name.trim().toUpperCase();
}

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function approvedInsForBucket(
  teamName: string,
  position: PlayerPosition,
  date: string,
): Map<string, string> {
  const map = new Map<string, string>();
  const team = normName(teamName);
  for (const row of APPROVED_OUTFIELD_PAIRINGS) {
    if (
      normName(row.team_name) === team &&
      row.position === position &&
      row.transferred_on === date
    ) {
      map.set(normName(row.player_out_name), normName(row.player_in_name));
    }
  }
  return map;
}

/**
 * Pair outs and inns for one team/position/date bucket.
 * Approved OUT→IN names are applied first; remaining legs zip by name sort
 * and stay marked ambiguous when the bucket had multiple swaps.
 */
export function pairTransferLegs(
  outs: NamedLeg[],
  inns: NamedLeg[],
  approvedOutToIn: Map<string, string> = new Map(),
): Array<{ out: NamedLeg; in: NamedLeg; ambiguous: boolean }> {
  const remainingOuts = [...outs];
  const remainingInns = [...inns];
  const pairs: Array<{ out: NamedLeg; in: NamedLeg; ambiguous: boolean }> = [];

  for (const [outName, inName] of approvedOutToIn) {
    const outIdx = remainingOuts.findIndex(
      (leg) => normName(leg.name) === outName,
    );
    const inIdx = remainingInns.findIndex(
      (leg) => normName(leg.name) === inName,
    );
    if (outIdx < 0 || inIdx < 0) continue;
    const [out] = remainingOuts.splice(outIdx, 1);
    const [inn] = remainingInns.splice(inIdx, 1);
    if (!out || !inn) continue;
    pairs.push({ out, in: inn, ambiguous: false });
  }

  const sortedOuts = sortByName(remainingOuts);
  const sortedInns = sortByName(remainingInns);
  const n = Math.min(sortedOuts.length, sortedInns.length);
  const ambiguous =
    sortedOuts.length > 1 ||
    sortedInns.length > 1 ||
    sortedOuts.length !== sortedInns.length;
  for (let i = 0; i < n; i++) {
    pairs.push({
      out: sortedOuts[i]!,
      in: sortedInns[i]!,
      ambiguous,
    });
  }
  return pairs;
}

export function deriveOutfieldTransfers(
  stints: OutfieldStintSeed[],
  teamNameById: Map<string, string>,
  seasonStartsOn: string | null,
): DerivedOutfieldTransfer[] {
  const outsByKey = new Map<string, NamedLeg[]>();
  const innsByKey = new Map<string, NamedLeg[]>();
  const metaByKey = new Map<
    string,
    { team_id: string; position: PlayerPosition; date: string }
  >();

  for (const stint of stints) {
    if (stint.released_at) {
      const date = toDateOnly(stint.released_at);
      const key = `${stint.team_id}|${stint.position}|${date}`;
      metaByKey.set(key, {
        team_id: stint.team_id,
        position: stint.position,
        date,
      });
      const list = outsByKey.get(key) ?? [];
      list.push({
        id: stint.player_id,
        name: stint.player_name,
        club: stint.club,
        date,
      });
      outsByKey.set(key, list);
    }

    if (
      seasonStartsOn &&
      toDateOnly(stint.acquired_at) > toDateOnly(seasonStartsOn)
    ) {
      const date = toDateOnly(stint.acquired_at);
      const key = `${stint.team_id}|${stint.position}|${date}`;
      metaByKey.set(key, {
        team_id: stint.team_id,
        position: stint.position,
        date,
      });
      const list = innsByKey.get(key) ?? [];
      list.push({
        id: stint.player_id,
        name: stint.player_name,
        club: stint.club,
        date,
      });
      innsByKey.set(key, list);
    }
  }

  const results: DerivedOutfieldTransfer[] = [];
  for (const [key, meta] of metaByKey) {
    const outs = outsByKey.get(key) ?? [];
    const inns = innsByKey.get(key) ?? [];
    if (outs.length === 0 || inns.length === 0) continue;

    const team_name = teamNameById.get(meta.team_id) ?? "Unknown team";
    const approved = approvedInsForBucket(
      team_name,
      meta.position,
      meta.date,
    );
    const pairs = pairTransferLegs(outs, inns, approved);
    for (const pair of pairs) {
      results.push({
        id: `outfield:${key}:${pair.out.id}:${pair.in.id}`,
        team_id: meta.team_id,
        team_name,
        transferred_on: meta.date,
        position: meta.position,
        player_out_id: pair.out.id,
        player_out_name: pair.out.name,
        player_out_club: pair.out.club,
        player_in_id: pair.in.id,
        player_in_name: pair.in.name,
        player_in_club: pair.in.club,
        pairing_ambiguous: pair.ambiguous,
      });
    }
  }

  return results.sort((a, b) => {
    const byDate = b.transferred_on.localeCompare(a.transferred_on);
    if (byDate !== 0) return byDate;
    const byTeam = a.team_name.localeCompare(b.team_name);
    if (byTeam !== 0) return byTeam;
    return a.player_out_name.localeCompare(b.player_out_name);
  });
}

export function deriveGoalkeeperTransfers(
  stints: GoalkeeperStintSeed[],
  teamNameById: Map<string, string>,
  seasonStartsOn: string | null,
): DerivedGoalkeeperTransfer[] {
  const outsByKey = new Map<string, NamedLeg[]>();
  const innsByKey = new Map<string, NamedLeg[]>();
  const metaByKey = new Map<string, { team_id: string; date: string }>();

  for (const stint of stints) {
    if (stint.released_at) {
      const date = toDateOnly(stint.released_at);
      const key = `${stint.team_id}|GK|${date}`;
      metaByKey.set(key, { team_id: stint.team_id, date });
      const list = outsByKey.get(key) ?? [];
      list.push({
        id: stint.goalkeeper_club_id,
        name: stint.club_name,
        club: stint.club_name,
        date,
      });
      outsByKey.set(key, list);
    }

    if (
      seasonStartsOn &&
      toDateOnly(stint.acquired_at) > toDateOnly(seasonStartsOn)
    ) {
      const date = toDateOnly(stint.acquired_at);
      const key = `${stint.team_id}|GK|${date}`;
      metaByKey.set(key, { team_id: stint.team_id, date });
      const list = innsByKey.get(key) ?? [];
      list.push({
        id: stint.goalkeeper_club_id,
        name: stint.club_name,
        club: stint.club_name,
        date,
      });
      innsByKey.set(key, list);
    }
  }

  const results: DerivedGoalkeeperTransfer[] = [];
  for (const [key, meta] of metaByKey) {
    const outs = outsByKey.get(key) ?? [];
    const inns = innsByKey.get(key) ?? [];
    if (outs.length === 0 || inns.length === 0) continue;

    const pairs = pairTransferLegs(outs, inns);
    const team_name = teamNameById.get(meta.team_id) ?? "Unknown team";
    for (const pair of pairs) {
      results.push({
        id: `gk:${key}:${pair.out.id}:${pair.in.id}`,
        team_id: meta.team_id,
        team_name,
        transferred_on: meta.date,
        club_out_id: pair.out.id,
        club_out_name: pair.out.name,
        club_in_id: pair.in.id,
        club_in_name: pair.in.name,
        pairing_ambiguous: pair.ambiguous,
      });
    }
  }

  return results.sort((a, b) => {
    const byDate = b.transferred_on.localeCompare(a.transferred_on);
    if (byDate !== 0) return byDate;
    const byTeam = a.team_name.localeCompare(b.team_name);
    if (byTeam !== 0) return byTeam;
    return a.club_out_name.localeCompare(b.club_out_name);
  });
}
