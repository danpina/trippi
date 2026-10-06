"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <p className="eyebrow text-ember">Something went wrong</p>
      <h1 className="font-display text-3xl font-medium text-ink mt-1 mb-3">That didn&apos;t work</h1>
      <p className="text-slate text-sm mb-7">
        It&apos;s on our side, not yours. Try again, and if it keeps happening please let us know.
        {error.digest && <span className="block text-xs mt-2">Reference: {error.digest}</span>}
      </p>
      <div className="flex gap-3 justify-center">
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-secondary">
          Home
        </Link>
      </div>
    </div>
  );
}
