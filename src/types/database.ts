export type UserRole = "visitor" | "manager" | "commissioner";

export type PlayerPosition = "goalkeeper" | "outfield";

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
  manager_id: string | null;
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

export type GoalEvent = {
  id: string;
  season_id: string;
  player_id: string;
  team_id: string;
  event_type: GoalEventType;
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

/** League points = GF − GA; tie-break = GF (see scoring comments on goal_events). */
export type TeamStanding = {
  team_id: string;
  goals_for: number;
  goals_against: number;
  points: number;
};
