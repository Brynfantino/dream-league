/**
 * Import Dream League 2026/27 spreadsheet extracts into Supabase.
 *
 * Source of truth for game rules: docs/Dream-League_PRD.md (Project store).
 * Do not invent rules. Scope locked by Bryn (2026-11-25):
 * - Skip I ROBOT
 * - No BFL Challenge / Bet Settlement
 * - No cup fixtures (starts February)
 * - One login per manager; teams may have multiple managers (team_managers)
 *
 *   npx tsx scripts/import-season/import_season.ts --dry-run
 *   npx tsx scripts/import-season/import_season.ts --apply
 *   npx tsx scripts/import-season/import_season.ts --apply --synthetic-goals
 *
 * --synthetic-goals is OPTIONAL (not required by PRD). Spreadsheet only has
 * cumulative totals; expand only if Bryn wants the table populated before
 * commissioner match entry.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "data");
/** Import convention for auction signings with no sheet date (not a PRD date). */
const SEASON_START = "2026-08-01";
const SEASON_NAME = "2026/2027";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const syntheticGoals = args.has("--synthetic-goals");
const dryRun = !apply;

type TeamRow = {
  team: string;
  manager: string;
  managers?: string[];
  placeholder?: boolean;
};

type PlayerRow = {
  key: string;
  name: string;
  club: string | null;
  is_goalkeeper: boolean;
};

type Membership = {
  team: string;
  player_key: string;
  acquired_date: string | null;
  sold_date: string | null;
  goals_for_while_owned: number | null;
  goals_against_while_owned: number | null;
  is_goalkeeper: boolean;
};

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(DATA, name), "utf8")) as T;
}

function requireEnv(): { url: string; key: string } {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    throw new Error(
      "Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY via secrets/env.",
    );
  }
  return { url, key };
}

async function main() {
  const seasonMeta = loadJson<{ name: string; label: string }>("season.json");
  const teams = loadJson<{ teams: TeamRow[] }>("teams.json").teams.filter(
    (t) => !t.placeholder && t.team !== "I ROBOT",
  );
  const players = loadJson<{ players: PlayerRow[] }>("players.json").players;
  const memberships = loadJson<{ memberships: Membership[] }>(
    "squad_memberships.json",
  ).memberships.filter((m) => m.team !== "I ROBOT");
  const managersDoc = loadJson<{
    managers: Array<{ display_name: string; teams: string[] }>;
  }>("managers.json");
  const table = loadJson<{ standings: unknown[] }>("table_snapshot.json");

  console.log("Season:", seasonMeta.name, "/", seasonMeta.label);
  console.log("Teams:", teams.length, "(I ROBOT excluded)");
  console.log("Individual managers:", managersDoc.managers.length);
  console.log("Players:", players.length);
  console.log("Memberships:", memberships.length);
  console.log("Table checksum rows:", table.standings.length);
  console.log("Cup / BFL / bets: not imported (locked out of v1 seed)");
  console.log(
    "Mode:",
    dryRun
      ? "DRY RUN"
      : syntheticGoals
        ? "APPLY + optional synthetic goal_events"
        : "APPLY (no goal_events)",
  );

  if (dryRun) {
    console.log(
      "\nNext steps:\n" +
        "1. Apply foundation migrations + 20261125192000_team_managers.sql.\n" +
        "2. Set SUPABASE_SERVICE_ROLE_KEY via secrets.\n" +
        "3. Run seed_2026_27.sql in SQL Editor, or re-run with --apply.\n" +
        "4. Link each person after signup (MANAGER_LINK.md). Ask Bryn for full names where sheet has first names only.\n" +
        "5. Do not use --synthetic-goals unless Bryn confirms (PRD expects commissioner goal entry).\n",
    );
    return;
  }

  const { url, key } = requireEnv();
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing } = await supabase
    .from("seasons")
    .select("id")
    .eq("name", SEASON_NAME);
  if (existing?.length) {
    const { error } = await supabase
      .from("seasons")
      .delete()
      .eq("name", SEASON_NAME);
    if (error) throw error;
    console.log("Deleted prior season", SEASON_NAME);
  }

  const { data: season, error: seasonErr } = await supabase
    .from("seasons")
    .insert({
      name: SEASON_NAME,
      starts_on: SEASON_START,
      ends_on: "2027-05-31",
      is_active: true,
    })
    .select("id")
    .single();
  if (seasonErr) throw seasonErr;
  const seasonId = season.id as string;
  console.log("Season id", seasonId);

  const { data: teamRows, error: teamErr } = await supabase
    .from("teams")
    .insert(teams.map((t) => ({ season_id: seasonId, name: t.team })))
    .select("id, name");
  if (teamErr) throw teamErr;
  const teamIdByName = new Map(
    teamRows!.map((t) => [t.name as string, t.id as string]),
  );

  const managerPayload: Array<{
    team_id: string;
    profile_id: null;
    display_name: string;
  }> = [];
  for (const t of teams) {
    const names = t.managers?.length
      ? t.managers
      : managersDoc.managers
          .filter((m) => m.teams.includes(t.team))
          .map((m) => m.display_name);
    const teamId = teamIdByName.get(t.team);
    if (!teamId) throw new Error(`Missing team id for ${t.team}`);
    for (const display_name of names) {
      managerPayload.push({ team_id: teamId, profile_id: null, display_name });
    }
  }
  for (const chunk of chunked(managerPayload, 100)) {
    const { error } = await supabase.from("team_managers").insert(chunk);
    if (error) throw error;
  }
  console.log("Inserted team_managers", managerPayload.length);

  const { data: playerRows, error: playerErr } = await supabase
    .from("players")
    .insert(
      players.map((p) => ({
        name: p.name,
        club: p.club,
        position: p.is_goalkeeper ? "goalkeeper" : "outfield",
      })),
    )
    .select("id, name, club, position");
  if (playerErr) throw playerErr;

  const playerIdByKey = new Map<string, string>();
  const usedPlayerIds = new Set<string>();
  for (const p of players) {
    const position = p.is_goalkeeper ? "goalkeeper" : "outfield";
    const match = playerRows!.find(
      (row) =>
        row.name === p.name &&
        row.position === position &&
        (row.club ?? null) === (p.club ?? null) &&
        !usedPlayerIds.has(row.id as string),
    );
    if (!match) {
      throw new Error(`Could not map player key ${p.key}`);
    }
    usedPlayerIds.add(match.id as string);
    playerIdByKey.set(p.key, match.id as string);
  }

  const membershipPayload = memberships.map((m) => {
    const teamId = teamIdByName.get(m.team);
    const playerId = playerIdByKey.get(m.player_key);
    if (!teamId || !playerId) {
      throw new Error(`Missing ids for ${m.team} / ${m.player_key}`);
    }
    return {
      season_id: seasonId,
      team_id: teamId,
      player_id: playerId,
      acquired_at: `${m.acquired_date ?? SEASON_START}T00:00:00.000Z`,
      released_at: m.sold_date ? `${m.sold_date}T23:59:59.000Z` : null,
    };
  });

  for (const chunk of chunked(membershipPayload, 100)) {
    const { error } = await supabase.from("squad_memberships").insert(chunk);
    if (error) throw error;
  }
  console.log("Inserted memberships", membershipPayload.length);

  if (syntheticGoals) {
    await insertSyntheticGoals(
      supabase,
      seasonId,
      teamIdByName,
      playerIdByKey,
      memberships,
    );
  }

  console.log(
    "Done. No cup/BFL/bets seeded. Link managers via MANAGER_LINK.md after signup.",
  );
}

async function insertSyntheticGoals(
  supabase: SupabaseClient,
  seasonId: string,
  teamIdByName: Map<string, string>,
  playerIdByKey: Map<string, string>,
  memberships: Membership[],
) {
  const events: Array<{
    season_id: string;
    player_id: string;
    team_id: string;
    event_type: "outfield_goal" | "gk_conceded";
    occurred_on: string;
    notes: string;
  }> = [];

  for (const m of memberships) {
    const teamId = teamIdByName.get(m.team)!;
    const playerId = playerIdByKey.get(m.player_key)!;
    const on = m.acquired_date ?? SEASON_START;
    const gf = m.goals_for_while_owned ?? 0;
    const ga = m.goals_against_while_owned ?? 0;
    if (!m.is_goalkeeper && gf > 0) {
      for (let i = 0; i < gf; i++) {
        events.push({
          season_id: seasonId,
          player_id: playerId,
          team_id: teamId,
          event_type: "outfield_goal",
          occurred_on: on,
          notes: "import: expanded from spreadsheet cumulative GF (optional)",
        });
      }
    }
    if (m.is_goalkeeper && ga > 0) {
      for (let i = 0; i < ga; i++) {
        events.push({
          season_id: seasonId,
          player_id: playerId,
          team_id: teamId,
          event_type: "gk_conceded",
          occurred_on: on,
          notes: "import: expanded from spreadsheet cumulative GA (optional)",
        });
      }
    }
  }

  console.log("Synthetic goal_events to insert:", events.length);
  for (const chunk of chunked(events, 200)) {
    const { error } = await supabase.from("goal_events").insert(chunk);
    if (error) throw error;
  }
}

function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
