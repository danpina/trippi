"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "@/app/actions";

export default function RegisterPage() {
  const [state, formAction] = useActionState(registerAction, undefined);

  return (
    <div className="max-w-sm mx-auto px-6 py-20">
      <h1 className="font-display italic text-3xl text-ink mb-7">Sign up</h1>
      <form action={formAction} className="card p-7 space-y-4">
        <div>
          <label className="eyebrow text-slate">Name</label>
          <input name="name" required className="input mt-1.5" />
        </div>
        <div>
          <label className="eyebrow text-slate">Email</label>
          <input type="email" name="email" required className="input mt-1.5" />
        </div>
        <div>
          <label className="eyebrow text-slate">Password</label>
          <input type="password" name="password" required minLength={6} className="input mt-1.5" />
        </div>
        {state?.error && <p className="text-sm text-ember-deep font-semibold">{state.error}</p>}
        <button className="btn-primary w-full">Create account</button>
      </form>
      <p className="text-sm text-slate mt-5">
        Already have an account?{" "}
        <Link href="/login" className="text-ember font-bold hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
