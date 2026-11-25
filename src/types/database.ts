export type UserRole = "visitor" | "manager" | "commissioner";

/** Outfield positions only (PRD §3). Goalkeepers are clubs. */
export type PlayerPosition = "DEF" | "MID" | "FWD";

export type GoalEventType = "outfield_goal" | "gk_conceded";

export type TransferStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "cancelled";

export type Profile = {
  id: string;
  display_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type Season = {
  id: string;
  name: string;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
  created_at: string;
};

export type Team = {
  id: string;
  season_id: string;
  name: string;
  created_at: string;
};

export type TeamManager = {
  id: string;
  team_id: string;
  profile_id: string | null;
  display_name: string;
  created_at: string;
};

export type GoalkeeperClub = {
  id: string;
  name: string;
  created_at: string;
};

export type Player = {
  id: string;
  name: string;
  club: string | null;
  position: PlayerPosition;
  created_at: string;
};

export type SquadMembership = {
  id: string;
  season_id: string;
  team_id: string;
  player_id: string;
  acquired_at: string;
  released_at: string | null;
};

export type GoalkeeperMembership = {
  id: string;
  season_id: string;
  team_id: string;
  goalkeeper_club_id: string;
  acquired_at: string;
  released_at: string | null;
};

export type GoalEvent = {
  id: string;
  season_id: string;
  team_id: string;
  event_type: GoalEventType;
  player_id: string | null;
  goalkeeper_club_id: string | null;
  occurred_on: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type Transfer = {
  id: string;
  season_id: string;
  proposing_team_id: string;
  player_in_id: string | null;
  player_out_id: string | null;
  goalkeeper_club_in_id: string | null;
  goalkeeper_club_out_id: string | null;
  status: TransferStatus;
  proposed_by: string;
  reviewed_by: string | null;
  notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type CupTie = {
  id: string;
  season_id: string;
  round_name: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  played_on: string | null;
  created_at: string;
};

export type Honour = {
  id: string;
  season_id: string | null;
  team_id: string | null;
  title: string;
  season_label: string | null;
  created_at: string;
};

/** League points = GF − GA; order: points, then GF; remain tied if equal (PRD §8). */
export type TeamStanding = {
  team_id: string;
  goals_for: number;
  goals_against: number;
  points: number;
};
