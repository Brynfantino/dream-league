import { AppNav } from "@/components/nav";
import { getAuthState } from "@/lib/auth/profile";

// Session read via cookies — allow blocking until auth streams (Cache Components).
export const instant = false;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthState();
  const role = auth.profile?.role ?? null;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav role={role} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
