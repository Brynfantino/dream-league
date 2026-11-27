#!/usr/bin/env python3
"""Generate seed_2025_26.sql from data-2025-26/*.json extracts."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data-2025-26"
OUT = ROOT / "seed_2025_26.sql"
SEASON = "2025/2026"
SEASON_START = "2025-08-01"


def sql_str(value: str | None) -> str:
  if value is None:
    return "null"
  return "'" + str(value).replace("'", "''") + "'"


def load(name: str):
  return json.loads((DATA / name).read_text())


def main() -> None:
  season = load("season.json")
  teams = load("teams.json")["teams"]
  players = load("players.json")["players"]
  gk_clubs = load("goalkeeper_clubs.json")["clubs"]
  squad = load("squad_memberships.json")["memberships"]
  gk_mems = load("goalkeeper_memberships.json")["memberships"]
  cup = load("cup_dream_league.json")["ties"]
  bfl = load("cup_bfl_challenge.json")["ties"]
  honours = load("honours.json")["honours"]

  lines: list[str] = []
  a = lines.append

  a("-- Auto-generated seed for Dream League 2025/26 (historical, inactive)")
  a("-- Apply AFTER core + RLS + 20261127120000_cup_ties_competition_and_labels.sql")
  a("-- Bryn: inactive season; skip I ROBOT; Cup + BFL + honours; Coventry/Windass fixes;")
  a("-- multi-swap adjacency approved in app (derive-transfers).")
  a("-- cup_ties scores = weekend net points (GF-GA). External BFL sides use *_name.")
  a("-- goal_events expanded from spreadsheet FOR/AGAINST (not match-dated).")
  a("")
  a("begin;")
  a("")
  a(f"delete from public.seasons where name = {sql_str(SEASON)};")
  a("")
  a("insert into public.seasons (name, starts_on, ends_on, is_active)")
  a(
    f"values ({sql_str(SEASON)}, {sql_str(season['starts_on'])}, "
    f"{sql_str(season['ends_on'])}, false);"
  )
  a("")

  a("insert into public.teams (season_id, name)")
  a("select s.id, v.team_name")
  a("from public.seasons s")
  a("cross join (values")
  for i, team in enumerate(teams):
    comma = "," if i < len(teams) - 1 else ""
    a(f"  ({sql_str(team['team'])}){comma}")
  a(") as v(team_name)")
  a(f"where s.name = {sql_str(SEASON)};")
  a("")

  mgr_rows: list[tuple[str, str]] = []
  for team in teams:
    for manager in team["managers"]:
      mgr_rows.append((team["team"], manager))

  a("insert into public.team_managers (team_id, profile_id, display_name)")
  a("select t.id, null, v.display_name")
  a("from public.teams t")
  a(
    f"join public.seasons s on s.id = t.season_id and s.name = {sql_str(SEASON)}"
  )
  a("join (values")
  for i, (team_name, display_name) in enumerate(mgr_rows):
    comma = "," if i < len(mgr_rows) - 1 else ""
    a(f"  ({sql_str(team_name)}, {sql_str(display_name)}){comma}")
  a(") as v(team_name, display_name) on v.team_name = t.name;")
  a("")

  a("insert into public.goalkeeper_clubs (name)")
  a("select club_name from (values")
  for i, club in enumerate(gk_clubs):
    comma = "," if i < len(gk_clubs) - 1 else ""
    a(f"  ({sql_str(club['name'])}){comma}")
  a(") as v(club_name)")
  a("on conflict (name) do nothing;")
  a("")

  a("insert into public.players (name, club, position)")
  a("select v.name, v.club, v.position::public.player_position")
  a("from (values")
  for i, player in enumerate(players):
    comma = "," if i < len(players) - 1 else ""
    a(
      f"  ({sql_str(player['name'])}, {sql_str(player['club'])}, "
      f"{sql_str(player['position'])}){comma}"
    )
  a(") as v(name, club, position)")
  a("where not exists (")
  a("  select 1 from public.players p")
  a("  where p.name = v.name")
  a("    and p.position = v.position::public.player_position")
  a("    and p.club is not distinct from v.club")
  a(");")
  a("")

  a("insert into public.squad_memberships (")
  a("  season_id, team_id, player_id, acquired_at, released_at")
  a(")")
  a("select s.id, t.id, p.id,")
  a(
    f"  (coalesce(v.acquired_date, {sql_str(SEASON_START)}) "
    f"|| 'T00:00:00.000Z')::timestamptz,"
  )
  a("  case")
  a("    when v.sold_date is null then null")
  a("    else (v.sold_date || 'T23:59:59.000Z')::timestamptz")
  a("  end")
  a(f"from public.seasons s")
  a(
    f"join public.teams t on t.season_id = s.id and s.name = {sql_str(SEASON)}"
  )
  a("join (values")
  for i, mem in enumerate(squad):
    comma = "," if i < len(squad) - 1 else ""
    a(
      f"  ({sql_str(mem['team'])}, {sql_str(mem['player_name'])}, "
      f"{sql_str(mem['club'])}, {sql_str(mem['position'])}, "
      f"{sql_str(mem['acquired_date'])}, {sql_str(mem['sold_date'])}){comma}"
    )
  a(
    ") as v(team_name, player_name, club, position, acquired_date, sold_date)"
  )
  a("  on v.team_name = t.name")
  a("join public.players p")
  a("  on p.name = v.player_name")
  a(" and p.position = v.position::public.player_position")
  a(" and p.club is not distinct from v.club;")
  a("")

  a("insert into public.goalkeeper_memberships (")
  a("  season_id, team_id, goalkeeper_club_id, acquired_at, released_at")
  a(")")
  a("select s.id, t.id, g.id,")
  a(
    f"  (coalesce(v.acquired_date, {sql_str(SEASON_START)}) "
    f"|| 'T00:00:00.000Z')::timestamptz,"
  )
  a("  case")
  a("    when v.sold_date is null then null")
  a("    else (v.sold_date || 'T23:59:59.000Z')::timestamptz")
  a("  end")
  a("from public.seasons s")
  a(
    f"join public.teams t on t.season_id = s.id and s.name = {sql_str(SEASON)}"
  )
  a("join (values")
  for i, mem in enumerate(gk_mems):
    comma = "," if i < len(gk_mems) - 1 else ""
    a(
      f"  ({sql_str(mem['team'])}, {sql_str(mem['goalkeeper_club'])}, "
      f"{sql_str(mem['acquired_date'])}, {sql_str(mem['sold_date'])}){comma}"
    )
  a(") as v(team_name, club_name, acquired_date, sold_date)")
  a("  on v.team_name = t.name")
  a("join public.goalkeeper_clubs g on g.name = v.club_name;")
  a("")

  # goal_events from cumulatives
  a("insert into public.goal_events (")
  a(
    "  season_id, team_id, event_type, player_id, goalkeeper_club_id, "
    "occurred_on, notes"
  )
  a(")")
  a("select s.id, t.id, 'outfield_goal'::public.goal_event_type, p.id, null,")
  a(f"  coalesce(v.acquired_date, {sql_str(SEASON_START)})::date,")
  a(
    "  'import: expanded from spreadsheet cumulative FOR (ownership stint)'"
  )
  a("from public.seasons s")
  a(
    f"join public.teams t on t.season_id = s.id and s.name = {sql_str(SEASON)}"
  )
  a("join (values")
  outfield_goal_rows: list[tuple] = []
  for mem in squad:
    gf = int(mem["goals_for_while_owned"] or 0)
    for _ in range(gf):
      outfield_goal_rows.append(
        (
          mem["team"],
          mem["player_name"],
          mem["club"],
          mem["position"],
          mem["acquired_date"],
        )
      )
  for i, row in enumerate(outfield_goal_rows):
    comma = "," if i < len(outfield_goal_rows) - 1 else ""
    team, name, club, position, acquired = row
    a(
      f"  ({sql_str(team)}, {sql_str(name)}, {sql_str(club)}, "
      f"{sql_str(position)}, {sql_str(acquired)}){comma}"
    )
  a(
    ") as v(team_name, player_name, club, position, acquired_date)"
  )
  a("  on v.team_name = t.name")
  a("join public.players p")
  a("  on p.name = v.player_name")
  a(" and p.position = v.position::public.player_position")
  a(" and p.club is not distinct from v.club;")
  a("")

  a("insert into public.goal_events (")
  a(
    "  season_id, team_id, event_type, player_id, goalkeeper_club_id, "
    "occurred_on, notes"
  )
  a(")")
  a("select s.id, t.id, 'gk_conceded'::public.goal_event_type, null, g.id,")
  a(f"  coalesce(v.acquired_date, {sql_str(SEASON_START)})::date,")
  a(
    "  'import: expanded from spreadsheet cumulative AGAINST "
    "(GK ownership stint)'"
  )
  a("from public.seasons s")
  a(
    f"join public.teams t on t.season_id = s.id and s.name = {sql_str(SEASON)}"
  )
  a("join (values")
  gk_goal_rows: list[tuple] = []
  for mem in gk_mems:
    ga = int(mem["goals_against_while_owned"] or 0)
    for _ in range(ga):
      gk_goal_rows.append(
        (mem["team"], mem["goalkeeper_club"], mem["acquired_date"])
      )
  for i, row in enumerate(gk_goal_rows):
    comma = "," if i < len(gk_goal_rows) - 1 else ""
    team, club, acquired = row
    a(f"  ({sql_str(team)}, {sql_str(club)}, {sql_str(acquired)}){comma}")
  a(") as v(team_name, club_name, acquired_date)")
  a("  on v.team_name = t.name")
  a("join public.goalkeeper_clubs g on g.name = v.club_name;")
  a("")

  def emit_cup_ties(ties: list[dict]) -> None:
    a("insert into public.cup_ties (")
    a(
      "  season_id, competition, round_name, home_team_id, away_team_id, "
      "home_name, away_name, home_score, away_score, played_on"
    )
    a(")")
    a("select s.id, v.competition, v.round_name,")
    a("  ht.id, at.id, v.home_name, v.away_name,")
    a("  v.home_score, v.away_score, v.played_on::date")
    a("from public.seasons s")
    a("join (values")
    for i, tie in enumerate(ties):
      comma = "," if i < len(ties) - 1 else ""
      home_team = tie.get("home_team")
      away_team = tie.get("away_team")
      home_name = tie.get("home_name") or home_team
      away_name = tie.get("away_name") or away_team
      a(
        "  ("
        f"{sql_str(tie['competition'])}, {sql_str(tie['round_name'])}, "
        f"{sql_str(home_team)}, {sql_str(away_team)}, "
        f"{sql_str(home_name)}, {sql_str(away_name)}, "
        f"{tie['home_score'] if tie['home_score'] is not None else 'null'}, "
        f"{tie['away_score'] if tie['away_score'] is not None else 'null'}, "
        f"{sql_str(tie.get('played_on'))}"
        f"){comma}"
      )
    a(
      ") as v(competition, round_name, home_team, away_team, "
      "home_name, away_name, home_score, away_score, played_on)"
    )
    a(f"  on s.name = {sql_str(SEASON)}")
    a("left join public.teams ht")
    a(
      "  on ht.season_id = s.id and ht.name = v.home_team"
    )
    a("left join public.teams at")
    a(
      "  on at.season_id = s.id and at.name = v.away_team;"
    )
    a("")

  # Cup ties need home_name always for constraint when team null —
  # for DL cup both teams set; still populate names for archive display.
  for tie in cup:
    tie.setdefault("home_name", tie["home_team"])
    tie.setdefault("away_name", tie["away_team"])
  emit_cup_ties(cup)
  emit_cup_ties(bfl)

  a("insert into public.honours (season_id, team_id, title, season_label)")
  a("select s.id, t.id, v.title, v.season_label")
  a("from public.seasons s")
  a("join (values")
  for i, honour in enumerate(honours):
    comma = "," if i < len(honours) - 1 else ""
    a(
      f"  ({sql_str(honour['team'])}, {sql_str(honour['title'])}, "
      f"{sql_str(honour['season_label'])}){comma}"
    )
  a(") as v(team_name, title, season_label)")
  a(f"  on s.name = {sql_str(SEASON)}")
  a("join public.teams t on t.season_id = s.id and t.name = v.team_name;")
  a("")

  a("commit;")
  a("")
  a(
    f"-- Expected: {len(teams)} teams, {len(squad)} outfield memberships, "
    f"{len(gk_mems)} GK memberships,"
  )
  a(
    f"-- {len(outfield_goal_rows)} outfield + {len(gk_goal_rows)} GK "
    f"goal_events, {len(cup)} cup + {len(bfl)} BFL ties, "
    f"{len(honours)} honours."
  )

  OUT.write_text("\n".join(lines) + "\n")
  print(
    f"Wrote {OUT} ({len(lines)} lines); "
    f"events={len(outfield_goal_rows)+len(gk_goal_rows)} "
    f"cup={len(cup)} bfl={len(bfl)} honours={len(honours)}"
  )


if __name__ == "__main__":
  main()
