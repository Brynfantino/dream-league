export type NavItem = {
  href: string;
  label: string;
};

/**
 * Primary destinations — labels match PRD §13 Application Pages where listed.
 * All-Time Table is an archive surface (franchise continuity across seasons).
 * Paths use kebab-case for URLs (UX); labels are the product names.
 */
export const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/league-table", label: "League Table" },
  { href: "/all-time-table", label: "All-Time Table" },
  { href: "/team-page", label: "Team Page" },
  { href: "/player-directory", label: "Player Directory" },
  { href: "/transfer-centre", label: "Transfer Centre" },
  { href: "/cup-centre", label: "Cup Centre" },
  { href: "/account-settings", label: "Account Settings" },
];

/**
 * Commissioner Console (PRD §13) — single entry; console page hosts admin stubs.
 */
export const commissionerNav: NavItem[] = [
  { href: "/commissioner-console", label: "Commissioner Console" },
];
