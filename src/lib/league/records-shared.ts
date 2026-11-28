/**
 * Client-safe Dream League Records types (no next/server / Supabase).
 * Designed so new categories/groups/records can be appended without UI redesign.
 */

export type RecordEntityKind = "player" | "team" | "goalkeeper_club";

/** One named holder of a record (joint holders share the same value). */
export type RecordHolder = {
  kind: RecordEntityKind;
  name: string;
  /** Player Profile id when kind is player. */
  player_id: string | null;
  /** Active-season Team Page id when a franchise link is available. */
  link_team_id: string | null;
  /** Franchise / team label for context (player records, GK ownership). */
  team_name: string | null;
  /** Season label when the record is season-scoped. */
  season_name: string | null;
  /** Display value, e.g. "142 goals", "3 titles". */
  value_label: string;
  /** Numeric value used for ranking / ties. */
  value: number;
};

export type RecordEntry = {
  /** Stable id for expansion, e.g. `player.career.goals`. */
  id: string;
  title: string;
  description?: string;
  holders: RecordHolder[];
};

export type RecordGroup = {
  id: string;
  title: string;
  records: RecordEntry[];
};

export type RecordsSection = {
  id: string;
  title: string;
  groups: RecordGroup[];
};

export type RecordsPageData = {
  sections: RecordsSection[];
  /** Seasons included in season-scoped records (typically completed only). */
  season_scope_note: string | null;
};
