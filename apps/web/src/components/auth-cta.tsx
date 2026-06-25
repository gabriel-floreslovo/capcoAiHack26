"use client";

import { signIn, signOut } from "next-auth/react";

type AuthCtaProps = {
  configured: boolean;
  signedIn: boolean;
};

export function AuthCta({ configured, signedIn }: AuthCtaProps) {
  if (!configured) {
    return (
      <div className="rounded-3xl border border-amber-300 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
        Add <code>GITHUB_ID</code>, <code>GITHUB_SECRET</code>,{" "}
        <code>NEXTAUTH_SECRET</code>, and <code>NEXTAUTH_URL</code> in
        <code> .env.local</code> to enable GitHub login.
      </div>
    );
  }

  if (signedIn) {
    return (
      <button
        className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
        onClick={() => signOut({ callbackUrl: "/" })}
        type="button"
      >
        Sign out
      </button>
    );
  }

  return (
    <button
      className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
      onClick={() => signIn("github", { callbackUrl: "/" })}
      type="button"
    >
      Connect GitHub
    </button>
  );
}
