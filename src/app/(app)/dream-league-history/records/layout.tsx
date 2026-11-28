import { RecordsInsightsSubnav } from "@/components/history/records-insights-subnav";

export default function RecordsInsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="font-display text-2xl tracking-wide text-pitch-950 sm:text-3xl">
          Records & Insights
        </h2>
        <p className="text-sm text-pitch-800">
          Who was best, and what&apos;s interesting — Dream League history in
          two complementary views.
        </p>
      </header>
      <RecordsInsightsSubnav />
      {children}
    </div>
  );
}
