"use client";

import { signIn, signOut } from "next-auth/react";

type AuthCtaProps = {
  configured: boolean;
  signedIn: boolean;
};

export function AuthCta({ configured, signedIn }: AuthCtaProps) {
  if (!configured) {
    return (
      <div className="rounded-full border border-amber-400/30 bg-amber-50/80 px-4 py-3 text-sm leading-7 text-amber-950">
        Add <code>GITHUB_ID</code>, <code>GITHUB_SECRET</code>,{" "}
        <code>NEXTAUTH_SECRET</code>, and <code>NEXTAUTH_URL</code> in
        <code> .env.local</code> to enable GitHub login.
      </div>
    );
  }

  if (signedIn) {
    return (
      <button
        className="rounded-full border border-slate-300 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-500 hover:text-emerald-950"
        onClick={() => signOut({ callbackUrl: "/" })}
        type="button"
      >
        Sign out
      </button>
    );
  }

  return (
    <button
      className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
      onClick={() => signIn("github", { callbackUrl: "/" })}
      type="button"
    >
      Connect GitHub
    </button>
  );
}
