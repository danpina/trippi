import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <p className="eyebrow text-ember">404</p>
      <h1 className="font-display text-3xl font-medium text-ink mt-1 mb-3">We couldn&apos;t find that page</h1>
      <p className="text-slate text-sm mb-7">
        The link may be old, or the listing may have been removed. Try searching for something similar.
      </p>
      <div className="flex gap-3 justify-center">
        <Link href="/search" className="btn-primary">
          Search listings
        </Link>
        <Link href="/" className="btn-secondary">
          Home
        </Link>
      </div>
    </div>
  );
}
