export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl tracking-wide text-pitch-950 sm:text-4xl">
        {title}
      </h1>
      <p className="max-w-2xl text-base text-pitch-800">{description}</p>
      <p className="text-sm text-pitch-600">
        Placeholder — no business logic in this foundation pass.
      </p>
    </div>
  );
}
