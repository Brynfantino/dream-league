import { getAuthState } from "@/lib/auth/profile";
import { StubPage } from "@/components/stub-page";

export const instant = false;

export default async function DashboardPage() {
  const auth = await getAuthState();

  return (
    <div className="space-y-6">
      <StubPage
        title="Dashboard"
        description="Season summary and quick links will live here."
      />
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-pitch-200 bg-white/70 p-4">
          <dt className="text-pitch-600">Auth</dt>
          <dd className="mt-1 font-medium text-pitch-950">
            {auth.configured
              ? auth.email
                ? `Signed in as ${auth.email}`
                : "Not signed in"
              : "Supabase env not configured"}
          </dd>
        </div>
        <div className="rounded-lg border border-pitch-200 bg-white/70 p-4">
          <dt className="text-pitch-600">Role</dt>
          <dd className="mt-1 font-medium capitalize text-pitch-950">
            {auth.profile?.role ?? "visitor (anonymous)"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
