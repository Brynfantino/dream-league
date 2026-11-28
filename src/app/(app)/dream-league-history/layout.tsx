import { HistorySubnav } from "@/components/history/history-subnav";

export default function DreamLeagueHistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl tracking-wide text-pitch-950 sm:text-4xl">
          Dream League History
        </h1>
        <p className="text-base text-pitch-800">
          Archive of trophies, franchise campaigns, season tables, and the Dream
          League Record Book. Read-only.
        </p>
      </header>
      <HistorySubnav />
      {children}
    </div>
  );
}
