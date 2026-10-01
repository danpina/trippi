import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import TrustedBadge from "@/components/TrustedBadge";
import { isTrustedHost } from "@/lib/trust";

export default async function Nav() {
  const user = await getCurrentUser();

  const linkCls = "hidden md:inline-block px-3 py-2 text-ink/80 hover:text-ink font-semibold";
  const mobileLinkCls = "px-3 py-2.5 rounded-lg text-ink/85 hover:bg-mist font-semibold";

  return (
    <header className="sticky top-0 z-30 bg-mist/80 backdrop-blur-md border-b border-line">
      {/* Checkbox-driven mobile menu — no client JS needed. It and the dropdown panel below
          are both direct children of <header> so Tailwind's peer-checked sibling selector
          can toggle the panel. */}
      <input type="checkbox" id="nav-toggle" className="hidden peer" />

      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="w-7 h-7 rounded-full bg-ember flex items-center justify-center shrink-0 group-hover:rotate-45 transition-transform duration-300">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor">
              <path d="M12 2l2.5 7.5H22l-6 4.5 2.3 7.5L12 17l-6.3 4.5L8 14 2 9.5h7.5z" />
            </svg>
          </span>
          <span className="font-display italic text-xl font-semibold text-ink tracking-tight">TripSwap</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link href="/search" className={linkCls}>
            Search
          </Link>
          {user ? (
            <>
              <Link href="/listings/new" className={linkCls}>
                Post a listing
              </Link>
              <Link href="/listings/mine" className={linkCls}>
                My listings
              </Link>
              <Link href="/messages" className={linkCls}>
                Messages
              </Link>
              <Link href="/saved" className={linkCls}>
                Saved
              </Link>
              {user.isAdmin && (
                <Link href="/admin" className="px-3 py-2 text-ember font-bold">
                  Admin
                </Link>
              )}
              <Link href="/settings" className="flex items-center gap-1.5 px-3 text-sm text-slate hover:text-ink">
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

        <div className="flex items-center gap-1 md:hidden">
          {user?.isAdmin && (
            <Link href="/admin" className="px-2 py-2 text-ember font-bold text-sm">
              Admin
            </Link>
          )}
          {!user && (
            <Link href="/login" className="btn-secondary !py-2 !px-3.5 text-xs mr-1">
              Log in
            </Link>
          )}
          <label
            htmlFor="nav-toggle"
            className="cursor-pointer p-2 -mr-2 text-ink"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </label>
        </div>
      </div>

      <div className="hidden peer-checked:flex md:hidden flex-col border-t border-line bg-mist px-4 py-3 gap-0.5">
        <Link href="/search" className={mobileLinkCls}>
          Search
        </Link>
        {user ? (
          <>
            <Link href="/listings/new" className={mobileLinkCls}>
              Post a listing
            </Link>
            <Link href="/listings/mine" className={mobileLinkCls}>
              My listings
            </Link>
            <Link href="/messages" className={mobileLinkCls}>
              Messages
            </Link>
            <Link href="/saved" className={mobileLinkCls}>
              Saved
            </Link>
            <Link href="/settings" className={mobileLinkCls}>
              {user.name}
              {user.ratingCount > 0 && ` · ${user.avgRating.toFixed(1)}★`}
            </Link>
            <form action={logoutAction} className="pt-1">
              <button className="btn-secondary w-full !py-2.5 text-sm">Log out</button>
            </form>
          </>
        ) : (
          <Link href="/register" className="btn-primary w-full !py-2.5 text-sm text-center mt-1">
            Sign up
          </Link>
        )}
      </div>
    </header>
  );
}
