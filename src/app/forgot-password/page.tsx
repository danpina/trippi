"use client";

import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions";
import { useServerForm } from "@/lib/useServerForm";

export default function ForgotPasswordPage() {
  const { state, pending, onSubmit } = useServerForm(requestPasswordResetAction);

  return (
    <div className="max-w-sm mx-auto px-6 py-20">
      <h1 className="font-display italic text-3xl text-ink mb-2">Forgot your password?</h1>
      <p className="text-sm text-slate mb-7">Enter your email and we&apos;ll send you a link to choose a new one.</p>
      <form onSubmit={onSubmit} className="card p-7 space-y-4">
        <div>
          <label className="eyebrow text-slate" htmlFor="fp-email">
            Email
          </label>
          <input id="fp-email" type="email" name="email" required autoComplete="email" className="input mt-1.5" />
        </div>
        {state?.error && (
          <p role="alert" className="text-sm text-ember-deep font-semibold">
            {state.error}
          </p>
        )}
        {state?.message && <p className="text-sm text-glacier-deep font-semibold">{state.message}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="text-sm text-slate mt-5">
        <Link href="/login" className="text-ember font-bold hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
