/**
 * Import Dream League 2026/27 spreadsheet extracts into Supabase (PRD schema).
 *
 * Rules: Project docs/Dream-League_PRD.md — do not invent.
 * Bryn locks: skip I ROBOT; no BFL/bets; empty cup; one login per manager.
 *
 *   npx tsx scripts/import-season/import_season.ts --dry-run
 *   npx tsx scripts/import-season/import_season.ts --apply
 *   npx tsx scripts/import-season/import_season.ts --apply --synthetic-goals
 *
 * --synthetic-goals is OPTIONAL (ask Bryn). Default leaves goal_events empty.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "data");
/** Import convention for undated auction signings (not a PRD date). */
const SEASON_START = "2026-08-01";
const SEASON_NAME = "2026/2027";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const syntheticGoals = args.has("--synthetic-goals");
const dryRun = !apply;

type TeamRow = {
  team: string;
  managers?: string[];
  placeholder?: boolean;
};

type PlayerRow = {
  key: string;
  name: string;
  club: string | null;
  position: "DEF" | "MID" | "FWD";
};

type SquadMem = {
  team: string;
  player_key: string;
  acquired_date: string | null;
  sold_date: string | null;
  goals_for_while_owned: number | null;
};

type GkMem = {
  team: string;
  goalkeeper_club: string;
  acquired_date: string | null;
  sold_date: string | null;
  goals_against_while_owned: number | null;
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

function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const seasonMeta = loadJson<{ name: string; label: string }>("season.json");
  const teams = loadJson<{ teams: TeamRow[] }>("teams.json").teams.filter(
    (t) => !t.placeholder && t.team !== "I ROBOT",
  );
  const managersDoc = loadJson<{
    managers: Array<{ display_name: string; teams: string[] }>;
  }>("managers.json");
  const players = loadJson<{ players: PlayerRow[] }>("players.json").players;
  const gkClubs = loadJson<{ clubs: Array<{ name: string }> }>(
    "goalkeeper_clubs.json",
  ).clubs;
  const squad = loadJson<{ memberships: SquadMem[] }>(
    "squad_memberships.json",
  ).memberships;
  const gkMems = loadJson<{ memberships: GkMem[] }>(
    "goalkeeper_memberships.json",
  ).memberships;
  const table = loadJson<{ standings: unknown[] }>("table_snapshot.json");

  console.log("Season:", seasonMeta.name, "/", seasonMeta.label);
  console.log("Teams:", teams.length, "(I ROBOT excluded)");
  console.log("Managers:", managersDoc.managers.length);
  console.log("Outfield players:", players.length);
  console.log("Goalkeeper clubs:", gkClubs.length);
  console.log("Squad memberships:", squad.length);
  console.log("GK memberships:", gkMems.length);
  console.log("Table checksum rows:", table.standings.length);
  console.log("Cup / BFL / bets: not imported");
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
      "\nNext: apply foundation migrations, set service role, then seed_2026_27.sql or --apply.\n" +
        "Link managers via MANAGER_LINK.md. Ask Bryn before --synthetic-goals.\n",
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
    const names =
      t.managers?.length
        ? t.managers
        : managersDoc.managers
            .filter((m) => m.teams.includes(t.team))
            .map((m) => m.display_name);
    const teamId = teamIdByName.get(t.team)!;
    for (const display_name of names) {
      managerPayload.push({ team_id: teamId, profile_id: null, display_name });
    }
  }
  for (const chunk of chunked(managerPayload, 100)) {
    const { error } = await supabase.from("team_managers").insert(chunk);
    if (error) throw error;
  }
  console.log("team_managers", managerPayload.length);

  const { data: gkRows, error: gkErr } = await supabase
    .from("goalkeeper_clubs")
    .insert(gkClubs.map((c) => ({ name: c.name })))
    .select("id, name");
  if (gkErr) throw gkErr;
  const gkIdByName = new Map(
    gkRows!.map((g) => [g.name as string, g.id as string]),
  );

  const { data: playerRows, error: playerErr } = await supabase
    .from("players")
    .insert(
      players.map((p) => ({
        name: p.name,
        club: p.club,
        position: p.position,
      })),
    )
    .select("id, name, club, position");
  if (playerErr) throw playerErr;

  const playerIdByKey = new Map<string, string>();
  const used = new Set<string>();
  for (const p of players) {
    const match = playerRows!.find(
      (row) =>
        row.name === p.name &&
        row.position === p.position &&
        (row.club ?? null) === (p.club ?? null) &&
        !used.has(row.id as string),
    );
    if (!match) throw new Error(`Could not map player ${p.key}`);
    used.add(match.id as string);
    playerIdByKey.set(p.key, match.id as string);
  }

  const squadPayload = squad.map((m) => {
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
  for (const chunk of chunked(squadPayload, 100)) {
    const { error } = await supabase.from("squad_memberships").insert(chunk);
    if (error) throw error;
  }
  console.log("squad_memberships", squadPayload.length);

  const gkmPayload = gkMems.map((m) => {
    const teamId = teamIdByName.get(m.team);
    const clubId = gkIdByName.get(m.goalkeeper_club);
    if (!teamId || !clubId) {
      throw new Error(`Missing ids for GK ${m.team} / ${m.goalkeeper_club}`);
    }
    return {
      season_id: seasonId,
      team_id: teamId,
      goalkeeper_club_id: clubId,
      acquired_at: `${m.acquired_date ?? SEASON_START}T00:00:00.000Z`,
      released_at: m.sold_date ? `${m.sold_date}T23:59:59.000Z` : null,
    };
  });
  for (const chunk of chunked(gkmPayload, 100)) {
    const { error } = await supabase
      .from("goalkeeper_memberships")
      .insert(chunk);
    if (error) throw error;
  }
  console.log("goalkeeper_memberships", gkmPayload.length);

  if (syntheticGoals) {
    await insertSyntheticGoals(
      supabase,
      seasonId,
      teamIdByName,
      playerIdByKey,
      gkIdByName,
      squad,
      gkMems,
    );
  }

  console.log("Done. No cup/BFL/bets. Link managers via MANAGER_LINK.md.");
}

async function insertSyntheticGoals(
  supabase: SupabaseClient,
  seasonId: string,
  teamIdByName: Map<string, string>,
  playerIdByKey: Map<string, string>,
  gkIdByName: Map<string, string>,
  squad: SquadMem[],
  gkMems: GkMem[],
) {
  const events: Array<{
    season_id: string;
    team_id: string;
    event_type: "outfield_goal" | "gk_conceded";
    player_id: string | null;
    goalkeeper_club_id: string | null;
    occurred_on: string;
    notes: string;
  }> = [];

  for (const m of squad) {
    const gf = m.goals_for_while_owned ?? 0;
    if (gf <= 0) continue;
    const teamId = teamIdByName.get(m.team)!;
    const playerId = playerIdByKey.get(m.player_key)!;
    const on = m.acquired_date ?? SEASON_START;
    for (let i = 0; i < gf; i++) {
      events.push({
        season_id: seasonId,
        team_id: teamId,
        event_type: "outfield_goal",
        player_id: playerId,
        goalkeeper_club_id: null,
        occurred_on: on,
        notes: "import: expanded from spreadsheet cumulative GF (optional)",
      });
    }
  }

  for (const m of gkMems) {
    const ga = m.goals_against_while_owned ?? 0;
    if (ga <= 0) continue;
    const teamId = teamIdByName.get(m.team)!;
    const clubId = gkIdByName.get(m.goalkeeper_club)!;
    const on = m.acquired_date ?? SEASON_START;
    for (let i = 0; i < ga; i++) {
      events.push({
        season_id: seasonId,
        team_id: teamId,
        event_type: "gk_conceded",
        player_id: null,
        goalkeeper_club_id: clubId,
        occurred_on: on,
        notes: "import: expanded from spreadsheet cumulative GA (optional)",
      });
    }
  }

  console.log("Synthetic goal_events:", events.length);
  for (const chunk of chunked(events, 200)) {
    const { error } = await supabase.from("goal_events").insert(chunk);
    if (error) throw error;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
