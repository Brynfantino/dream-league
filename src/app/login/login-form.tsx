"use client";

import { useActionState, useState } from "react";

import {
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
  type AuthFormState,
} from "./actions";

const initialState: AuthFormState = { error: null };

type Mode = "sign-in" | "sign-up" | "magic-link";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [magicSent, setMagicSent] = useState(false);

  const [passwordState, passwordAction, passwordPending] = useActionState(
    mode === "sign-up" ? signUpWithPassword : signInWithPassword,
    initialState,
  );

  const [magicState, magicAction, magicPending] = useActionState(
    async (prev: AuthFormState, formData: FormData) => {
      const result = await signInWithMagicLink(prev, formData);
      if (!result.error) {
        setMagicSent(true);
      }
      return result;
    },
    initialState,
  );

  const error =
    mode === "magic-link" ? magicState.error : passwordState.error;
  const pending = mode === "magic-link" ? magicPending : passwordPending;

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="flex gap-2 text-sm">
        {(
          [
            ["sign-in", "Sign in"],
            ["sign-up", "Sign up"],
            ["magic-link", "Magic link"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setMagicSent(false);
            }}
            className={`rounded-md px-3 py-1.5 font-medium ${
              mode === value
                ? "bg-pitch-900 text-white"
                : "bg-pitch-100 text-pitch-800 hover:bg-pitch-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "magic-link" ? (
        magicSent ? (
          <p className="rounded-md border border-pitch-200 bg-white/80 p-4 text-sm text-pitch-800">
            Check your email for a sign-in link.
          </p>
        ) : (
          <form action={magicAction} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-pitch-700">Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-md border border-pitch-300 bg-white px-3 py-2 text-pitch-950 outline-none focus:border-pitch-600"
              />
            </label>
            {error ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-pitch-900 px-4 py-2 text-sm font-medium text-white hover:bg-pitch-800 disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )
      ) : (
        <form action={passwordAction} className="space-y-4">
          {mode === "sign-up" ? (
            <label className="block text-sm">
              <span className="mb-1 block text-pitch-700">Display name</span>
              <input
                name="display_name"
                type="text"
                autoComplete="nickname"
                className="w-full rounded-md border border-pitch-300 bg-white px-3 py-2 text-pitch-950 outline-none focus:border-pitch-600"
              />
            </label>
          ) : null}
          <label className="block text-sm">
            <span className="mb-1 block text-pitch-700">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-pitch-300 bg-white px-3 py-2 text-pitch-950 outline-none focus:border-pitch-600"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-pitch-700">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={
                mode === "sign-up" ? "new-password" : "current-password"
              }
              className="w-full rounded-md border border-pitch-300 bg-white px-3 py-2 text-pitch-950 outline-none focus:border-pitch-600"
            />
          </label>
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-pitch-900 px-4 py-2 text-sm font-medium text-white hover:bg-pitch-800 disabled:opacity-60"
          >
            {pending
              ? "Working…"
              : mode === "sign-up"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
      )}
    </div>
  );
}
