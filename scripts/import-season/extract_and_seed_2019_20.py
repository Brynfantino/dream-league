#!/usr/bin/env python3
"""Extract Dream League 2019/20 from legacy .xls and generate seed SQL.

Source: DreamLeague19-20.xls (Stats / Table / Cup).
COVID-disrupted season: Cup bracket incomplete in workbook; Cup Winners
recorded as RASH IN THE ATTIC (Bryn 2026-11-27). No Transfers sheet —
acquired/sold dates stay null in extracts (no invented mid-season dates).
Sold stints are closed at season ends_on in SQL only so GK unique-active
constraints hold; extracts still show sold_date null.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import xlrd

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data-2019-20"
OUT = ROOT / "seed_2019_20.sql"
XLS = Path(
  "/home/ubuntu/.cursor/projects/agent-repos-dream-league/uploads/"
  "DreamLeague19-20_dc6d.xls"
)

SEASON = "2019/2020"
SEASON_LABEL = "19/20"
SEASON_START = "2019-08-01"
SEASON_END = "2020-05-31"
SOURCE_FILE = "DreamLeague19-20_dc6d.xls"

POS_MAP = {
  "GOALKEEPER": "GK",
  "DEFENDER": "DEF",
  "MIDFIELDER": "MID",
  "FORWARD": "FWD",
}

CUP_NAME_ALIASES = {
  "DYNAMO DURHAM": "DURHAM DYNAMO",
  "ROBS ROVERS": "ROBS ROVERS",
  "SHOW ME THE MANE": "SHOW ME THE MANE",
  "SHEFSPANYOL": "SHEFSPANYOL",
  "ERIMUS": "ERIMUS",
  "AMALGA SANTOS": "AMALGA SANTOS",
  "FC WALES": "FC WALES",
  "MCTOMINATOR": "MCTOMINATOR",
  "RASH IN THE ATTIC": "RASH IN THE ATTIC",
}


def norm_name(value: object) -> str:
  text = str(value or "").strip().upper()
  text = re.sub(r"\s+", " ", text)
  return text


def sql_str(value: str | None) -> str:
  if value is None:
    return "null"
  return "'" + str(value).replace("'", "''") + "'"


def cell(sheet: xlrd.sheet.Sheet, row: int, col: int) -> object:
  if row >= sheet.nrows or col >= sheet.ncols:
    return ""
  return sheet.cell_value(row, col)


def write_json(name: str, payload: object) -> None:
  DATA.mkdir(parents=True, exist_ok=True)
  (DATA / name).write_text(json.dumps(payload, indent=2) + "\n")


def parse_table(book: xlrd.book.Book) -> list[dict]:
  sheet = book.sheet_by_name("Table")
  rows: list[dict] = []
  for r in range(6, sheet.nrows):
    team = norm_name(cell(sheet, r, 3))
    if not team:
      continue
    rows.append(
      {
        "position": int(float(cell(sheet, r, 1))),
        "owner": norm_name(cell(sheet, r, 2)),
        "team": team,
        "points": int(float(cell(sheet, r, 4))),
        "goals_for": int(float(cell(sheet, r, 5))),
        "goals_against": int(float(cell(sheet, r, 6))),
      }
    )
  return rows


def parse_stats(book: xlrd.book.Book) -> list[dict]:
  sheet = book.sheet_by_name("Stats")
  teams: list[dict] = []
  current: dict | None = None

  for r in range(sheet.nrows):
    pos_raw = norm_name(cell(sheet, r, 1))
    col_c = norm_name(cell(sheet, r, 2))
    col_d = norm_name(cell(sheet, r, 3))

    # Title row: team in C, owner in D, no position
    if (
      col_c
      and col_d
      and not pos_raw
      and col_c not in {"PLAYER", "POSITION"}
      and "DREAM LEAGUE" not in col_c
    ):
      if current and current["players"]:
        teams.append(current)
      current = {
        "team": col_c,
        "owner": col_d,
        "players": [],
      }
      continue

    if not current or pos_raw not in POS_MAP:
      continue
    player = norm_name(cell(sheet, r, 2))
    if not player:
      continue

    club = norm_name(cell(sheet, r, 3))
    cost_raw = cell(sheet, r, 4)
    cost_text = str(cost_raw).strip().upper()
    is_transfer = cost_text == "TRANSFER"
    fa = float(cell(sheet, r, 5) or 0)
    sold = norm_name(cell(sheet, r, 6)) == "SOLD"

    current["players"].append(
      {
        "position": POS_MAP[pos_raw],
        "player_name": player,
        "club": club,
        "auction_cost": None if is_transfer else float(cost_raw),
        "acquired_how": "transfer" if is_transfer else "auction",
        "goals": fa,
        "sold": sold,
        "source_row": r + 1,  # 1-based for humans
      }
    )

  if current and current["players"]:
    teams.append(current)
  return teams


def resolve_cup_team(name: str) -> str | None:
  key = norm_name(name)
  if not key:
    return None
  return CUP_NAME_ALIASES.get(key, key)


def parse_cup(book: xlrd.book.Book) -> list[dict]:
  sheet = book.sheet_by_name("Cup")
  ties: list[dict] = []
  round_name = "Unknown"
  game_n = 0

  for r in range(sheet.nrows):
    a = str(cell(sheet, r, 0) or "").strip()
    b = cell(sheet, r, 1)
    c = cell(sheet, r, 2)
    d = str(cell(sheet, r, 3) or "").strip()

    if a and not d and b == "" and c == "":
      label = a.strip()
      if label.lower().startswith("dream league cup"):
        continue
      if label.lower() == "winner":
        continue
      round_name = label
      continue

    if not a or not d:
      continue

    home = resolve_cup_team(a)
    away = resolve_cup_team(d)
    home_score = None if b == "" else int(float(b))
    away_score = None if c == "" else int(float(c))
    game_n += 1
    ties.append(
      {
        "competition": "dream_league_cup",
        "round_name": round_name,
        "slot": f"Game {game_n}",
        "home_team": home,
        "away_team": away,
        "home_name": home,
        "away_name": away,
        "home_score": home_score,
        "away_score": away_score,
        "played_on": None,
        "source_row": r + 1,
      }
    )
  return ties


def build_extracts(book: xlrd.book.Book) -> dict:
  standings = parse_table(book)
  squad_blocks = parse_stats(book)
  cup_ties = parse_cup(book)

  teams = []
  managers = []
  for row in standings:
    teams.append(
      {
        "team": row["team"],
        "manager": row["owner"],
        "managers": [row["owner"]],
        "placeholder": False,
        "in_league_table": True,
      }
    )
    managers.append({"team": row["team"], "display_name": row["owner"]})

  # Prefer Stats owner if present (should match Table)
  by_team = {t["team"]: t for t in squad_blocks}

  players: dict[tuple[str, str, str], dict] = {}
  gk_clubs: dict[str, dict] = {}
  squad_memberships: list[dict] = []
  gk_memberships: list[dict] = []

  for block in squad_blocks:
    team = block["team"]
    owner = block["owner"]
    for p in block["players"]:
      if p["position"] == "GK":
        club = p["club"]
        gk_clubs[club] = {"name": club}
        gk_memberships.append(
          {
            "id": f"{team}::{club}::r{p['source_row']}",
            "team": team,
            "manager": owner,
            "goalkeeper_club": club,
            "goalkeeper_player_name": p["player_name"],
            "acquired_how": p["acquired_how"],
            "auction_cost": p["auction_cost"],
            "status": "sold" if p["sold"] else "active",
            "acquired_date": None,
            "sold_date": None,
            "goals_against_while_owned": int(p["goals"]),
            "source_row": p["source_row"],
            "date_confidence": "unknown",
          }
        )
      else:
        key = (p["player_name"], p["club"], p["position"])
        players[key] = {
          "name": p["player_name"],
          "club": p["club"],
          "position": p["position"],
        }
        squad_memberships.append(
          {
            "id": (
              f"{team}::{p['player_name']}::{p['club']}::r{p['source_row']}"
            ),
            "team": team,
            "manager": owner,
            "player_key": f"{p['player_name']}::{p['club']}",
            "player_name": p["player_name"],
            "club": p["club"],
            "position": p["position"],
            "acquired_how": p["acquired_how"],
            "auction_cost": p["auction_cost"],
            "status": "sold" if p["sold"] else "active",
            "acquired_date": None,
            "sold_date": None,
            "goals_for_while_owned": int(p["goals"]),
            "source_row": p["source_row"],
            "date_confidence": "unknown",
          }
        )

  # Stats ↔ Table reconcile
  bad = []
  for row in standings:
    block = by_team.get(row["team"])
    if not block:
      bad.append({"team": row["team"], "reason": "missing_stats_block"})
      continue
    gf = sum(int(p["goals"]) for p in block["players"] if p["position"] != "GK")
    ga = sum(int(p["goals"]) for p in block["players"] if p["position"] == "GK")
    if gf != row["goals_for"] or ga != row["goals_against"]:
      bad.append(
        {
          "team": row["team"],
          "stats_gf": gf,
          "table_gf": row["goals_for"],
          "stats_ga": ga,
          "table_ga": row["goals_against"],
        }
      )

  season = {
    "name": SEASON,
    "label": "Dream League 2019/20",
    "starts_on": SEASON_START,
    "ends_on": SEASON_END,
    "is_active": False,
    "source_file": SOURCE_FILE,
    "team_count_in_table": len(standings),
    "notes": [
      "COVID-disrupted season; Cup sheet incomplete after 2nd round.",
      "Cup Winners = RASH IN THE ATTIC (Bryn 2026-11-27); not filled in workbook.",
      "No Transfers sheet — membership acquired/sold dates left null (unknown).",
      "Negative cup scores are weekend net points (same convention as later seasons).",
    ],
    "verification": {
      "all_table_rows_match_summed_membership_stats": len(bad) == 0,
      "ok": len(standings) - len(bad),
      "bad": bad,
    },
    "outfield_membership_count": len(squad_memberships),
    "goalkeeper_membership_count": len(gk_memberships),
    "goal_events_estimate": sum(
      int(m["goals_for_while_owned"] or 0) for m in squad_memberships
    )
    + sum(int(m["goals_against_while_owned"] or 0) for m in gk_memberships),
    "transfer_dates_available": False,
  }

  honours = {
    "season": SEASON,
    "honours": [
      {
        "title": "League Champions",
        "team": "ROBS ROVERS",
        "season_label": SEASON_LABEL,
      },
      {
        "title": "Cup Winners",
        "team": "RASH IN THE ATTIC",
        "season_label": SEASON_LABEL,
        "note": "Bryn-confirmed; workbook Winner cell blank (COVID).",
      },
    ],
  }

  cup = {
    "competition": "Dream League Cup",
    "season": SEASON,
    "status": "incomplete_bracket_covid",
    "winner": "RASH IN THE ATTIC",
    "winner_source": "Bryn 2026-11-27 (COVID-disrupted; sheet Winner blank)",
    "ties": cup_ties,
  }

  write_json("season.json", season)
  write_json("teams.json", {"season": SEASON, "teams": teams})
  write_json("managers.json", {"season": SEASON, "managers": managers})
  write_json("table_snapshot.json", {"season": SEASON, "standings": standings})
  write_json(
    "players.json",
    {
      "season": SEASON,
      "players": sorted(
        players.values(), key=lambda p: (p["position"], p["name"], p["club"])
      ),
    },
  )
  write_json(
    "goalkeeper_clubs.json",
    {
      "season": SEASON,
      "clubs": sorted(gk_clubs.values(), key=lambda c: c["name"]),
    },
  )
  write_json(
    "squad_memberships.json",
    {
      "season": SEASON,
      "count": len(squad_memberships),
      "date_policy": (
        "No transfer dates in source workbook; acquired_date and sold_date "
        "are null for all stints (unknown, not estimated)."
      ),
      "memberships": squad_memberships,
    },
  )
  write_json(
    "goalkeeper_memberships.json",
    {
      "season": SEASON,
      "count": len(gk_memberships),
      "date_policy": (
        "No transfer dates in source workbook; acquired_date and sold_date "
        "are null for all stints (unknown, not estimated)."
      ),
      "memberships": gk_memberships,
    },
  )
  write_json("cup_dream_league.json", cup)
  write_json("honours.json", honours)
  write_json(
    "approved_transfer_pairings.json",
    {
      "season": SEASON,
      "note": (
        "Transfer dates unavailable in 2019/20 workbook (COVID / no Transfers "
        "sheet). No dated multi-swap approvals. Adjacency flags exist in Stats "
        "(SOLD→TRANSFER) but dates intentionally left unknown."
      ),
      "pairings": [],
    },
  )

  if bad:
    raise SystemExit(f"Stats↔Table mismatch: {bad}")

  return {
    "season": season,
    "teams": teams,
    "players": sorted(
      players.values(), key=lambda p: (p["position"], p["name"], p["club"])
    ),
    "gk_clubs": sorted(gk_clubs.values(), key=lambda c: c["name"]),
    "squad": squad_memberships,
    "gk_mems": gk_memberships,
    "cup": cup_ties,
    "honours": honours["honours"],
  }


def seed_released_date(mem: dict) -> str | None:
  """Extracts keep sold_date null. SQL closes sold stints at season end so
  unique-active GK indexes remain valid — not a claimed transfer date."""
  if mem.get("status") == "sold":
    return SEASON_END
  return None


def generate_seed(payload: dict) -> None:
  season = payload["season"]
  teams = payload["teams"]
  players = payload["players"]
  gk_clubs = payload["gk_clubs"]
  squad = payload["squad"]
  gk_mems = payload["gk_mems"]
  cup = payload["cup"]
  honours = payload["honours"]

  lines: list[str] = []
  a = lines.append

  a("-- Auto-generated seed for Dream League 2019/2020 (historical, inactive)")
  a("-- Apply AFTER core + RLS + cup_ties competition migration.")
  a("-- COVID-disrupted; Cup Winners = RASH IN THE ATTIC (Bryn).")
  a("-- Transfer dates unknown in source — extracts keep null; sold stints")
  a("-- closed at ends_on in SQL for GK unique-active constraints only.")
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
  a("from public.seasons s")
  a(
    f"join public.teams t on t.season_id = s.id and s.name = {sql_str(SEASON)}"
  )
  a("join (values")
  for i, mem in enumerate(squad):
    comma = "," if i < len(squad) - 1 else ""
    a(
      f"  ({sql_str(mem['team'])}, {sql_str(mem['player_name'])}, "
      f"{sql_str(mem['club'])}, {sql_str(mem['position'])}, "
      f"{sql_str(mem['acquired_date'])}, "
      f"{sql_str(seed_released_date(mem))}){comma}"
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
      f"{sql_str(mem['acquired_date'])}, "
      f"{sql_str(seed_released_date(mem))}){comma}"
    )
  a(") as v(team_name, club_name, acquired_date, sold_date)")
  a("  on v.team_name = t.name")
  a("join public.goalkeeper_clubs g on g.name = v.club_name;")
  a("")

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

  if cup:
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
    for i, tie in enumerate(cup):
      comma = "," if i < len(cup) - 1 else ""
      a(
        "  ("
        f"{sql_str(tie['competition'])}, {sql_str(tie['round_name'])}, "
        f"{sql_str(tie['home_team'])}, {sql_str(tie['away_team'])}, "
        f"{sql_str(tie['home_name'])}, {sql_str(tie['away_name'])}, "
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
    a("  on ht.season_id = s.id and ht.name = v.home_team")
    a("left join public.teams at")
    a("  on at.season_id = s.id and at.name = v.away_team;")
    a("")

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
    f"goal_events, {len(cup)} cup ties, {len(honours)} honours."
  )

  OUT.write_text("\n".join(lines) + "\n")
  print(
    f"Wrote extracts → {DATA} and {OUT} ({len(lines)} lines); "
    f"events={len(outfield_goal_rows) + len(gk_goal_rows)} "
    f"cup={len(cup)} honours={len(honours)}"
  )


def main() -> None:
  if not XLS.exists():
    raise SystemExit(f"Missing workbook: {XLS}")
  book = xlrd.open_workbook(str(XLS))
  payload = build_extracts(book)
  generate_seed(payload)


if __name__ == "__main__":
  main()
