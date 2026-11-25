import Link from "next/link";

import { PlaceholderPage } from "@/components/placeholder-page";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-pitch-700 bg-pitch-900 px-4 py-4 text-pitch-50 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/dashboard" className="font-display text-xl tracking-wide">
            Dream League
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-pitch-200 hover:text-white"
          >
            Back to app
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <PlaceholderPage
          title="Sign in"
          description="Auth UI will connect to Supabase later. Env placeholders live in .env.example."
        />
      </main>
    </div>
  );
}
