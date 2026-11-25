export type NavItem = {
  href: string;
  label: string;
};

/** Primary app destinations shown in the left sidebar. */
export const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/league-table", label: "League Table" },
  { href: "/teams", label: "Teams" },
  { href: "/players", label: "Players" },
  { href: "/transfers", label: "Transfers" },
  { href: "/cup", label: "Cup" },
  { href: "/account", label: "Account" },
];

/**
 * Commissioner tools — secondary stubs for future role gating.
 * Shown in the sidebar under a separate heading; no auth wiring yet.
 */
export const commissionerNav: NavItem[] = [
  { href: "/commissioner/goal-updates", label: "Goal Updates" },
  { href: "/commissioner/transfers-approval", label: "Transfers Approval" },
  { href: "/commissioner/seasons", label: "Seasons" },
  { href: "/commissioner/auction-import", label: "Auction Import" },
  { href: "/commissioner/administration", label: "Administration" },
];
