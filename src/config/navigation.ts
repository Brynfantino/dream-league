export type NavItem = {
  href: string;
  label: string;
};

/**
 * Primary destinations — labels match PRD §13 Application Pages where listed.
 * Dream League History is the archive hub (Trophy Room + All-Time Table).
 * Paths use kebab-case for URLs (UX); labels are the product names.
 */
export const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/league-table", label: "League Table" },
  { href: "/team-page", label: "Team Page" },
  { href: "/player-directory", label: "Player Directory" },
  { href: "/transfer-centre", label: "Transfer Centre" },
  { href: "/cup-centre", label: "Cup Centre" },
  { href: "/dream-league-history", label: "Dream League History" },
  { href: "/account-settings", label: "Account Settings" },
];

/**
 * Secondary surfaces inside Dream League History.
 */
export const historyNav: NavItem[] = [
  { href: "/dream-league-history/trophy-room", label: "Trophy Room" },
  { href: "/dream-league-history/all-time-table", label: "All-Time Table" },
  {
    href: "/dream-league-history/season-archive",
    label: "Season Archive",
  },
  {
    href: "/dream-league-history/records",
    label: "Dream League Records",
  },
  {
    href: "/dream-league-history/franchise-history",
    label: "Franchise History",
  },
];

/**
 * Commissioner Console (PRD §13) — single entry; console page hosts admin stubs.
 */
export const commissionerNav: NavItem[] = [
  { href: "/commissioner-console", label: "Commissioner Console" },
];
