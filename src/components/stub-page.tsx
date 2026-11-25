export function StubPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl text-pitch-950">{title}</h1>
      <p className="max-w-2xl text-pitch-800">{description}</p>
      <p className="text-sm text-pitch-600">
        Stub page — full behaviour arrives in a later phase.
      </p>
    </div>
  );
}
