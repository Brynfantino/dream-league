/**
 * Client-safe Franchise History types (no next/server / Supabase).
 * Snapshot is sectioned so cup campaigns, notes, etc. can append later.
 */

import type {
  DerivedGoalkeeperTransfer,
  DerivedOutfieldTransfer,
} from "@/lib/league/derive-transfers";
import type { SquadGoalkeeper, SquadOutfieldMember } from "@/lib/league/team-detail";
import type { TransferUsage } from "@/lib/league/transfer-usage";

export type FranchiseHistoryOption = {
  id: string;
  label: string;
};

export type FranchiseSeasonOption = {
  id: string;
  name: string;
  is_active: boolean;
};

export type FranchiseSeasonHonours = {
  league_champions: boolean;
  cup_winners: boolean;
  bfl_winners: boolean;
};

export type FranchiseHistorySnapshot = {
  franchise_id: string;
  season: {
    id: string;
    name: string;
    starts_on: string | null;
    ends_on: string | null;
    is_active: boolean;
  };
  team: { id: string; name: string };
  managers: string[];
  league_position: number;
  league_points: number;
  goals_for: number;
  goals_against: number;
  honours: FranchiseSeasonHonours;
  transfer_usage: TransferUsage;
  /** End-of-season squad: released_at IS NULL. */
  end_squad: {
    goalkeeper: SquadGoalkeeper | null;
    outfield: SquadOutfieldMember[];
  };
  transfers: {
    outfield: FranchiseOutfieldTransfer[];
    goalkeeper: FranchiseGoalkeeperTransfer[];
    /** True when mid-season dates cannot be trusted (e.g. 2019/20). */
    dates_uncertain: boolean;
  };
};

/** Outfield transfer with Dream League contribution while owned on this team. */
export type FranchiseOutfieldTransfer = DerivedOutfieldTransfer & {
  /** Goals while owned before leaving (OUT leg). */
  out_contribution: number;
  /** Goals while owned after arriving (IN leg). */
  in_contribution: number;
  /** in − out; positive means the move improved scoring contribution. */
  net_contribution: number;
};

/** Goalkeeper transfer with contribution (−concessions) while owned on this team. */
export type FranchiseGoalkeeperTransfer = DerivedGoalkeeperTransfer & {
  out_contribution: number;
  in_contribution: number;
  /** in − out; positive means fewer concessions after the swap. */
  net_contribution: number;
};
