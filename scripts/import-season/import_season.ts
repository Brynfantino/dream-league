/**
 * Import Dream League 2026/27 spreadsheet extracts into Supabase.
 *
 * Prefers the SQL seed for a one-shot load:
 *   scripts/import-season/seed_2026_27.sql  (SQL Editor / psql)
 *
 * This script is the programmatic path (service role):
 *   npx tsx scripts/import-season/import_season.ts --dry-run
 *   npx tsx scripts/import-season/import_season.ts --apply
 *   npx tsx scripts/import-season/import_season.ts --apply --synthetic-goals
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 * Never commit keys. Does not invent secrets.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "data");
const SEASON_START = "2026-08-01";
const SEASON_NAME = "2026/2027";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const syntheticGoals = args.has("--synthetic-goals");
const dryRun = !apply;

type TeamRow = {
  team: string;
  manager: string;
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
    (t) => !t.placeholder,
  );
  const players = loadJson<{ players: PlayerRow[] }>("players.json").players;
  const memberships = loadJson<{ memberships: Membership[] }>(
    "squad_memberships.json",
  ).memberships.filter((m) => m.team !== "I ROBOT");
  const table = loadJson<{ standings: unknown[] }>("table_snapshot.json");

  console.log("Season:", seasonMeta.name, "/", seasonMeta.label);
  console.log("Teams:", teams.length);
  console.log("Players:", players.length);
  console.log("Memberships:", memberships.length);
  console.log("Table checksum rows:", table.standings.length);
  console.log(
    "Mode:",
    dryRun
      ? "DRY RUN"
      : syntheticGoals
        ? "APPLY + synthetic goal_events"
        : "APPLY (no goal_events)",
  );

  if (dryRun) {
    console.log(
      "\nNext steps for Bryn:\n" +
        "1. Merge/apply foundation migrations (PR #1).\n" +
        "2. Set SUPABASE_SERVICE_ROLE_KEY in env.\n" +
        "3. Either paste seed_2026_27.sql in SQL Editor, or re-run this with --apply.\n" +
        "4. Optionally --synthetic-goals to materialise cumulative GF/GA as goal_events.\n" +
        "5. Link managers via MANAGER_LINK.md after signup.\n",
    );
    return;
  }

  const { url, key } = requireEnv();
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Clear prior season import
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
  const teamIdByName = new Map(teamRows!.map((t) => [t.name as string, t.id as string]));

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

  // Map spreadsheet key → player id via name+club+position
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

  // Insert in chunks
  for (const chunk of chunked(membershipPayload, 100)) {
    const { error } = await supabase.from("squad_memberships").insert(chunk);
    if (error) throw error;
  }
  console.log("Inserted memberships", membershipPayload.length);

  if (syntheticGoals) {
    await insertSyntheticGoals(supabase, seasonId, teamIdByName, playerIdByKey, memberships);
  }

  console.log("Done. Link managers with MANAGER_LINK.md. Verify against data/table_snapshot.json.");
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
          notes: "import: expanded from spreadsheet cumulative GF",
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
          notes: "import: expanded from spreadsheet cumulative GA",
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
