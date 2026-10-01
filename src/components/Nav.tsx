import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import TrustedBadge from "@/components/TrustedBadge";
import { isTrustedHost } from "@/lib/trust";

export default async function Nav() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-30 bg-mist/80 backdrop-blur-md border-b border-line">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="w-7 h-7 rounded-full bg-ember flex items-center justify-center shrink-0 group-hover:rotate-45 transition-transform duration-300">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor">
              <path d="M12 2l2.5 7.5H22l-6 4.5 2.3 7.5L12 17l-6.3 4.5L8 14 2 9.5h7.5z" />
            </svg>
          </span>
          <span className="font-display italic text-xl font-semibold text-ink tracking-tight">TripSwap</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          <Link href="/search" className="hidden sm:inline-block px-3 py-2 text-ink/80 hover:text-ink font-semibold">
            Search
          </Link>
          {user ? (
            <>
              <Link
                href="/listings/new"
                className="hidden sm:inline-block px-3 py-2 text-ink/80 hover:text-ink font-semibold"
              >
                Post a listing
              </Link>
              <Link
                href="/listings/mine"
                className="hidden sm:inline-block px-3 py-2 text-ink/80 hover:text-ink font-semibold"
              >
                My listings
              </Link>
              <Link href="/messages" className="hidden sm:inline-block px-3 py-2 text-ink/80 hover:text-ink font-semibold">
                Messages
              </Link>
              <Link href="/saved" className="hidden sm:inline-block px-3 py-2 text-ink/80 hover:text-ink font-semibold">
                Saved
              </Link>
              {user.isAdmin && (
                <Link href="/admin" className="px-3 py-2 text-ember font-bold">
                  Admin
                </Link>
              )}
              <Link
                href="/settings"
                className="hidden md:flex items-center gap-1.5 px-3 text-sm text-slate hover:text-ink"
              >
                {user.name}
                {isTrustedHost(user) && <TrustedBadge />}
                {user.ratingCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-gold font-bold">
                    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-gold">
                      <path d="M10 1l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L10 15l-5.6 3.1 1.4-6.3L1 7.5l6.4-.6z" />
                    </svg>
                    {user.avgRating.toFixed(1)}
                  </span>
                )}
              </Link>
              <form action={logoutAction}>
                <button className="btn-secondary !py-2 !px-4 text-xs">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary !py-2 !px-4 text-xs">
                Log in
              </Link>
              <Link href="/register" className="btn-primary !py-2 !px-4 text-xs">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
