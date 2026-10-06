"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPasswordAction } from "@/app/actions";
import { useServerForm } from "@/lib/useServerForm";

function ResetForm() {
  const { state, pending, onSubmit } = useServerForm(resetPasswordAction);
  const token = useSearchParams().get("token") || "";

  return (
    <div className="max-w-sm mx-auto px-6 py-20">
      <h1 className="font-display italic text-3xl text-ink mb-7">Choose a new password</h1>
      {!token ? (
        <div className="card p-7 text-sm text-slate">
          This link is missing its token.{" "}
          <Link href="/forgot-password" className="text-ember font-bold hover:underline">
            Request a new one
          </Link>
          .
        </div>
      ) : (
        <form onSubmit={onSubmit} className="card p-7 space-y-4">
          <input type="hidden" name="token" value={token} />
          <div>
            <label className="eyebrow text-slate" htmlFor="rp-password">
              New password
            </label>
            <input
              id="rp-password"
              type="password"
              name="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              className="input mt-1.5"
            />
          </div>
          <div>
            <label className="eyebrow text-slate" htmlFor="rp-confirm">
              Confirm new password
            </label>
            <input
              id="rp-confirm"
              type="password"
              name="confirm"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              className="input mt-1.5"
            />
          </div>
          {state?.error && (
            <p role="alert" className="text-sm text-ember-deep font-semibold">
              {state.error}
            </p>
          )}
          <button className="btn-primary w-full" disabled={pending}>
            {pending ? "Saving…" : "Set new password"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
