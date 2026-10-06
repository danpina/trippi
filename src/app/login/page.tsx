"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/app/actions";
import { useServerForm } from "@/lib/useServerForm";

function LoginForm() {
  const { state, pending, onSubmit } = useServerForm(loginAction);
  const params = useSearchParams();
  const next = params.get("next") || "";
  const justReset = params.get("reset") === "1";

  return (
    <div className="max-w-sm mx-auto px-6 py-20">
      <h1 className="font-display italic text-3xl text-ink mb-7">Log in</h1>
      {justReset && (
        <p className="mb-4 text-sm text-glacier-deep font-semibold">Password updated — log in with your new password.</p>
      )}
      <form onSubmit={onSubmit} className="card p-7 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="eyebrow text-slate" htmlFor="login-email">
            Email
          </label>
          <input id="login-email" type="email" name="email" required autoComplete="email" className="input mt-1.5" />
        </div>
        <div>
          <label className="eyebrow text-slate" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="input mt-1.5"
          />
        </div>
        {state?.error && (
          <p role="alert" className="text-sm text-ember-deep font-semibold">
            {state.error}
          </p>
        )}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </button>
        <p className="text-sm">
          <Link href="/forgot-password" className="text-slate hover:text-ink underline underline-offset-2">
            Forgot your password?
          </Link>
        </p>
      </form>
      <p className="text-sm text-slate mt-5">
        No account?{" "}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="text-ember font-bold hover:underline">
          Sign up
        </Link>
      </p>
      <p className="text-xs text-slate mt-6">Demo host: chamonix.chalet@example.com / demo1234</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
