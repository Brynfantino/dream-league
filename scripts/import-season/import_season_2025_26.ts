/**
 * Import Dream League 2025/26 historical season into Supabase (PRD schema).
 *
 * Rules: Project docs/Dream-League_PRD.md — do not invent.
 * Bryn (2026-11-27): inactive season 2025-08-01 → 2026-05-31; skip I ROBOT;
 * include Cup + BFL + honours; Coventry acquired 2025-10-23; Windass date ignored;
 * multi-swap adjacency approved (see derive-transfers APPROVED_OUTFIELD_PAIRINGS).
 *
 *   npx tsx scripts/import-season/import_season_2025_26.ts --dry-run
 *   npx tsx scripts/import-season/import_season_2025_26.ts --apply
 *   npx tsx scripts/import-season/import_season_2025_26.ts --apply --skip-goal-events
 *
 * Prefer SQL Editor + seed_2025_26.sql when service role is unavailable to the agent.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "data-2025-26");
const SEASON_START = "2025-08-01";
const SEASON_END = "2026-05-31";
const SEASON_NAME = "2025/2026";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const skipGoalEvents = args.has("--skip-goal-events");
const dryRun = !apply;

type TeamRow = { team: string; managers?: string[]; placeholder?: boolean };
type PlayerRow = {
  key: string;
  name: string;
  club: string | null;
  position: "DEF" | "MID" | "FWD";
};
type SquadMem = {
  team: string;
  player_key: string;
  player_name: string;
  club: string | null;
  position: "DEF" | "MID" | "FWD";
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
type CupTieRow = {
  competition: string;
  round_name: string;
  home_team: string | null;
  away_team: string | null;
  home_name?: string | null;
  away_name?: string | null;
  home_score: number | null;
  away_score: number | null;
  played_on: string | null;
};
type HonourRow = { team: string; title: string; season_label: string };

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
  const seasonMeta = loadJson<{
    name: string;
    label: string;
    starts_on: string;
    ends_on: string;
  }>("season.json");
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
  const cup = loadJson<{ ties: CupTieRow[]; winner: string }>(
    "cup_dream_league.json",
  );
  const bfl = loadJson<{ ties: CupTieRow[]; winner: string }>(
    "cup_bfl_challenge.json",
  );
  const honours = loadJson<{ honours: HonourRow[] }>("honours.json").honours;
  const pairings = loadJson<{ pairings: unknown[] }>(
    "approved_transfer_pairings.json",
  );

  const expectedGf = squad.reduce(
    (n, m) => n + (m.goals_for_while_owned ?? 0),
    0,
  );
  const expectedGa = gkMems.reduce(
    (n, m) => n + (m.goals_against_while_owned ?? 0),
    0,
  );

  console.log("Season:", seasonMeta.name, "/", seasonMeta.label);
  console.log("Dates:", seasonMeta.starts_on, "→", seasonMeta.ends_on, "(inactive)");
  console.log("Teams:", teams.length, "(I ROBOT excluded)");
  console.log("Managers:", managersDoc.managers.length);
  console.log("Outfield players:", players.length);
  console.log("Goalkeeper clubs:", gkClubs.length);
  console.log("Squad memberships:", squad.length);
  console.log("GK memberships:", gkMems.length);
  console.log("Table checksum rows:", table.standings.length);
  console.log("Cup ties:", cup.ties.length, "winner:", cup.winner);
  console.log("BFL ties:", bfl.ties.length, "winner:", bfl.winner);
  console.log("Honours:", honours.length);
  console.log("Approved multi-swap pairings:", pairings.pairings.length);
  console.log(
    "goal_events from cumulatives:",
    skipGoalEvents ? "SKIPPED" : `${expectedGf} outfield + ${expectedGa} GK`,
  );
  console.log("Mode:", dryRun ? "DRY RUN" : "APPLY");

  if (dryRun) {
    console.log(
      "\nNext: apply migration 20261127120000_cup_ties_competition_and_labels.sql,\n" +
        "then seed_2025_26.sql in SQL Editor OR --apply with service role.\n",
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
      ends_on: SEASON_END,
      is_active: false,
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

  // GK clubs: insert missing by unique name
  const { data: existingGk, error: egkErr } = await supabase
    .from("goalkeeper_clubs")
    .select("id, name");
  if (egkErr) throw egkErr;
  const gkIdByName = new Map(
    (existingGk ?? []).map((g) => [g.name as string, g.id as string]),
  );
  const missingGk = gkClubs.filter((c) => !gkIdByName.has(c.name));
  if (missingGk.length) {
    const { data: insertedGk, error } = await supabase
      .from("goalkeeper_clubs")
      .insert(missingGk.map((c) => ({ name: c.name })))
      .select("id, name");
    if (error) throw error;
    for (const g of insertedGk ?? []) {
      gkIdByName.set(g.name as string, g.id as string);
    }
  }
  console.log("goalkeeper_clubs mapped", gkIdByName.size);

  // Players: reuse by name+club+position
  const { data: existingPlayers, error: epErr } = await supabase
    .from("players")
    .select("id, name, club, position");
  if (epErr) throw epErr;

  const playerIdByKey = new Map<string, string>();
  const usedPlayerIds = new Set<string>();
  const missingPlayers: PlayerRow[] = [];

  for (const p of players) {
    const match = (existingPlayers ?? []).find(
      (row) =>
        row.name === p.name &&
        row.position === p.position &&
        (row.club ?? null) === (p.club ?? null) &&
        !usedPlayerIds.has(row.id as string),
    );
    if (match) {
      usedPlayerIds.add(match.id as string);
      playerIdByKey.set(p.key, match.id as string);
    } else {
      missingPlayers.push(p);
    }
  }

  if (missingPlayers.length) {
    const { data: inserted, error } = await supabase
      .from("players")
      .insert(
        missingPlayers.map((p) => ({
          name: p.name,
          club: p.club,
          position: p.position,
        })),
      )
      .select("id, name, club, position");
    if (error) throw error;
    const insertedUsed = new Set<string>();
    for (const p of missingPlayers) {
      const match = inserted!.find(
        (row) =>
          row.name === p.name &&
          row.position === p.position &&
          (row.club ?? null) === (p.club ?? null) &&
          !insertedUsed.has(row.id as string),
      );
      if (!match) throw new Error(`Could not map inserted player ${p.key}`);
      insertedUsed.add(match.id as string);
      playerIdByKey.set(p.key, match.id as string);
    }
  }
  console.log("players mapped", playerIdByKey.size);

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

  if (!skipGoalEvents) {
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

  await insertCupTies(supabase, seasonId, teamIdByName, [
    ...cup.ties,
    ...bfl.ties,
  ]);

  const honourPayload = honours.map((h) => {
    const teamId = teamIdByName.get(h.team);
    if (!teamId) throw new Error(`Honour team missing: ${h.team}`);
    return {
      season_id: seasonId,
      team_id: teamId,
      title: h.title,
      season_label: h.season_label,
    };
  });
  const { error: honourErr } = await supabase
    .from("honours")
    .insert(honourPayload);
  if (honourErr) throw honourErr;
  console.log("honours", honourPayload.length);

  console.log("Done. Season remains inactive. 2026/27 unchanged.");
}

async function insertCupTies(
  supabase: SupabaseClient,
  seasonId: string,
  teamIdByName: Map<string, string>,
  ties: CupTieRow[],
) {
  const payload = ties.map((t) => ({
    season_id: seasonId,
    competition: t.competition,
    round_name: t.round_name,
    home_team_id: t.home_team ? teamIdByName.get(t.home_team) ?? null : null,
    away_team_id: t.away_team ? teamIdByName.get(t.away_team) ?? null : null,
    home_name: t.home_name ?? t.home_team,
    away_name: t.away_name ?? t.away_team,
    home_score: t.home_score,
    away_score: t.away_score,
    played_on: t.played_on,
  }));
  for (const row of payload) {
    if (!row.home_name || !row.away_name) {
      throw new Error(`Cup tie missing side names: ${JSON.stringify(row)}`);
    }
    if (row.home_team_id === undefined || row.away_team_id === undefined) {
      throw new Error(`Cup tie unresolved DL team id: ${JSON.stringify(row)}`);
    }
  }
  for (const chunk of chunked(payload, 100)) {
    const { error } = await supabase.from("cup_ties").insert(chunk);
    if (error) throw error;
  }
  console.log("cup_ties", payload.length);
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
        notes:
          "import: expanded from spreadsheet cumulative FOR (ownership stint)",
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
        notes:
          "import: expanded from spreadsheet cumulative AGAINST (GK ownership stint)",
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
