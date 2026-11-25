import Link from "next/link";

import { LoginForm } from "./login-form";

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
        <div className="mb-8 space-y-2 text-center">
          <h1 className="font-display text-3xl text-pitch-950">Sign in</h1>
          <p className="text-sm text-pitch-700">
            Email auth via Supabase. Role (manager / commissioner) comes from
            your profile after sign-in.
          </p>
        </div>
        <LoginForm />
      </main>
    </div>
  );
}
