import { PlaceholderPage } from "@/components/placeholder-page";

export default function CommissionerConsolePage() {
  return (
    <div className="space-y-8">
      <PlaceholderPage
        title="Commissioner Console"
        description="Competition management hub (PRD §13). Stubs only — no business logic yet."
      />
      <ul className="list-inside list-disc space-y-1 text-sm text-pitch-800">
        <li>Pending Transfers</li>
        <li>Goal Updates</li>
        <li>Goalkeeper Updates</li>
        <li>Cup Administration</li>
        <li>Season Administration</li>
      </ul>
    </div>
  );
}
