"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/actions";

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, undefined);

  return (
    <div className="max-w-sm mx-auto px-6 py-20">
      <h1 className="font-display italic text-3xl text-ink mb-7">Log in</h1>
      <form action={formAction} className="card p-7 space-y-4">
        <div>
          <label className="eyebrow text-slate">Email</label>
          <input type="email" name="email" required className="input mt-1.5" />
        </div>
        <div>
          <label className="eyebrow text-slate">Password</label>
          <input type="password" name="password" required className="input mt-1.5" />
        </div>
        {state?.error && <p className="text-sm text-ember-deep font-semibold">{state.error}</p>}
        <button className="btn-primary w-full">Log in</button>
      </form>
      <p className="text-sm text-slate mt-5">
        No account?{" "}
        <Link href="/register" className="text-ember font-bold hover:underline">
          Sign up
        </Link>
      </p>
      <p className="text-xs text-slate mt-6">Demo host: chamonix.chalet@example.com / demo1234</p>
    </div>
  );
}
