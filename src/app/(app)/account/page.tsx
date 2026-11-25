import Link from "next/link";

import { getAuthState } from "@/lib/auth/profile";
import { signOut } from "@/app/login/actions";

export const instant = false;

export default async function AccountPage() {
  const auth = await getAuthState();

  if (!auth.userId) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl text-pitch-950">Account</h1>
        <p className="text-pitch-800">
          You are not signed in.{" "}
          <Link href="/login" className="font-medium underline underline-offset-2">
            Sign in
          </Link>{" "}
          with your email to manage your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-pitch-950">Account</h1>
      <dl className="max-w-md space-y-3 rounded-lg border border-pitch-200 bg-white/70 p-5 text-sm">
        <div>
          <dt className="text-pitch-600">Email</dt>
          <dd className="mt-1 font-medium text-pitch-950">{auth.email}</dd>
        </div>
        <div>
          <dt className="text-pitch-600">Display name</dt>
          <dd className="mt-1 font-medium text-pitch-950">
            {auth.profile?.display_name ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-pitch-600">Role</dt>
          <dd className="mt-1 font-medium capitalize text-pitch-950">
            {auth.profile?.role ?? "visitor"}
          </dd>
        </div>
      </dl>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-md bg-pitch-900 px-4 py-2 text-sm font-medium text-white hover:bg-pitch-800"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
