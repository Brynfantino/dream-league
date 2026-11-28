/**
 * Client-safe Insights types. Append new cards/groups without redesigning the page.
 */

export type InsightSubject = {
  name: string;
  /** Player Profile when this subject is a player. */
  player_id: string | null;
  /** Team Page when this subject is a franchise (or context franchise). */
  link_team_id: string | null;
  /** Render name with TeamNameLink when true. */
  is_team: boolean;
  /** Secondary line, e.g. franchise beside a player. */
  context: string | null;
  context_link_team_id: string | null;
};

export type InsightRunnerUp = {
  subject: InsightSubject;
  value_label: string;
};

export type InsightCard = {
  id: string;
  title: string;
  /** Short “why this is interesting” line. */
  blurb?: string;
  value_label: string;
  subjects: InsightSubject[];
  runners_up?: InsightRunnerUp[];
};

export type InsightGroup = {
  id: string;
  title: string;
  cards: InsightCard[];
};

export type InsightsPageData = {
  groups: InsightGroup[];
  note: string | null;
};
