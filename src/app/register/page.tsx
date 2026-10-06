"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { registerAction } from "@/app/actions";
import { useServerForm } from "@/lib/useServerForm";

function RegisterForm() {
  const { state, pending, onSubmit } = useServerForm(registerAction);
  const next = useSearchParams().get("next") || "";

  return (
    <div className="max-w-sm mx-auto px-6 py-20">
      <h1 className="font-display italic text-3xl text-ink mb-7">Sign up</h1>
      <form onSubmit={onSubmit} className="card p-7 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="eyebrow text-slate" htmlFor="reg-name">
            Name
          </label>
          <input id="reg-name" name="name" required maxLength={60} autoComplete="name" className="input mt-1.5" />
        </div>
        <div>
          <label className="eyebrow text-slate" htmlFor="reg-email">
            Email
          </label>
          <input id="reg-email" type="email" name="email" required autoComplete="email" className="input mt-1.5" />
        </div>
        <div>
          <label className="eyebrow text-slate" htmlFor="reg-password">
            Password
          </label>
          <input
            id="reg-password"
            type="password"
            name="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            className="input mt-1.5"
          />
          <p className="text-xs text-slate mt-1.5">At least 8 characters.</p>
        </div>
        <label className="flex items-start gap-2 text-sm text-ink/85">
          <input type="checkbox" name="acceptTerms" required className="accent-ember mt-0.5" />
          <span>
            I agree to the{" "}
            <Link href="/terms" target="_blank" className="text-ember font-semibold hover:underline">
              Terms &amp; disclaimer
            </Link>{" "}
            and the{" "}
            <Link href="/privacy" target="_blank" className="text-ember font-semibold hover:underline">
              Privacy policy
            </Link>
            .
          </span>
        </label>
        {state?.error && (
          <p role="alert" className="text-sm text-ember-deep font-semibold">
            {state.error}
          </p>
        )}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="text-sm text-slate mt-5">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-ember font-bold hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
