export type NavItem = {
  href: string;
  label: string;
};

/**
 * Primary destinations — labels match PRD §13 Application Pages where listed.
 * Trophy Room is an archive surface named by Bryn (League + Cup cabinet).
 * Paths use kebab-case for URLs (UX); labels are the product names.
 */
export const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/league-table", label: "League Table" },
  { href: "/team-page", label: "Team Page" },
  { href: "/player-directory", label: "Player Directory" },
  { href: "/transfer-centre", label: "Transfer Centre" },
  { href: "/cup-centre", label: "Cup Centre" },
  { href: "/trophy-room", label: "Trophy Room" },
  { href: "/account-settings", label: "Account Settings" },
];

/**
 * Commissioner Console (PRD §13) — single entry; console page hosts admin stubs.
 */
export const commissionerNav: NavItem[] = [
  { href: "/commissioner-console", label: "Commissioner Console" },
];
