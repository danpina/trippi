import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import CategoryIcon from "@/components/CategoryIcon";
import ListingCard from "@/components/ListingCard";
import HeroSearchInput from "@/components/HeroSearchInput";
import { styleFor } from "@/lib/categoryStyle";

export default async function HomePage() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const user = await getCurrentUser();
  const [featured, categories] = await Promise.all([
    db.listing.findMany({
      where: {
        moderationStatus: "published",
        status: "active",
        dateEnd: { gte: todayStart },
        ...(user ? { ownerId: { not: user.id } } : {}),
      },
      orderBy: [{ boosted: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: { category: { include: { parent: true } }, owner: true, photos: { take: 1 } },
    }),
    db.category.findMany({ where: { parentId: null }, orderBy: { name: "asc" } }),
  ]);

  const savedIds = user
    ? new Set(
        (
          await db.savedListing.findMany({
            where: { userId: user.id, listingId: { in: featured.map((l) => l.id) } },
            select: { listingId: true },
          })
        ).map((s) => s.listingId)
      )
    : new Set<string>();

  return (
    <div>
      {/* Hero — search-first, like BlaBlaCar/Airbnb/Kleinanzeigen: the search bar carries the
          page, not a headline. Alpenglow mood kept in a strip, not a slab. */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div
          aria-hidden
          className="blob w-[30rem] h-[30rem] -top-40 -right-24 bg-ember animate-drift"
        />
        <div
          aria-hidden
          className="blob w-[22rem] h-[22rem] -bottom-32 -left-20 bg-glacier animate-drift-slow"
        />

        <div className="relative max-w-6xl mx-auto px-6 pt-12 pb-12 md:pt-16 md:pb-16">
          <div className="flex items-baseline justify-between gap-4 flex-wrap animate-fade-up">
            <h1 className="font-display italic text-3xl sm:text-4xl font-medium text-balance">
              Someone&apos;s cancelled trip is your{" "}
              <span className="bg-gradient-to-r from-ember to-gold bg-clip-text text-transparent">
                open weekend
              </span>
              .
            </h1>
            <p className="text-white/60 text-xs uppercase tracking-wide font-semibold">
              Free to search · post what you can&apos;t use
            </p>
          </div>

          <form
            action="/search"
            method="GET"
            className="mt-6 flex flex-col sm:flex-row gap-2 bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl sm:rounded-full p-2 max-w-2xl shadow-glow animate-fade-up [animation-delay:80ms]"
          >
            <HeroSearchInput />
            <select
              name="category"
              className="bg-white/10 sm:bg-transparent text-white px-4 py-3 rounded-xl sm:rounded-none outline-none [&>option]:text-ink"
            >
              <option value="">Any activity</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <button className="btn-primary sm:!px-7 shrink-0">Search</button>
          </form>

          <div className="flex flex-wrap gap-2 mt-4 animate-fade-up [animation-delay:140ms]">
            {categories.map((c) => {
              const s = styleFor(c.slug);
              return (
                <Link
                  key={c.id}
                  href={`/search?category=${c.slug}`}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-3.5 py-1.5 rounded-full bg-white/8 border border-white/15 text-sm text-white/85 hover:bg-white/15 hover:border-white/30 transition-colors"
                >
                  <CategoryIcon name={s.icon} className="w-3.5 h-3.5" />
                  {c.name}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-display italic text-3xl text-ink">Featured right now</h2>
          <Link href="/search" className="text-sm font-bold text-ember hover:text-ember-deep">
            See all →
          </Link>
        </div>

        {featured.length === 0 ? (
          <p className="text-slate text-sm">
            No published listings yet.{" "}
            <Link href="/listings/new" className="text-ember font-semibold hover:underline">
              Be the first to post one
            </Link>
            .
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                saved={savedIds.has(listing.id)}
                showSave={!!user}
                savePath="/"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
