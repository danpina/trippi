import Link from "next/link";
import { db } from "@/lib/db";
import CategoryArt from "@/components/CategoryArt";
import CategoryIcon from "@/components/CategoryIcon";
import { styleFor } from "@/lib/categoryStyle";

export default async function HomePage() {
  const [featured, categories] = await Promise.all([
    db.listing.findMany({
      where: { moderationStatus: "published", status: "active" },
      orderBy: [{ boosted: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: { category: { include: { parent: true } }, owner: true, photos: { take: 1 } },
    }),
    db.category.findMany({ where: { parentId: null }, orderBy: { name: "asc" } }),
  ]);

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

        <div className="relative max-w-6xl mx-auto px-6 pt-8 pb-8 md:pt-10 md:pb-10">
          <div className="flex items-baseline justify-between gap-4 flex-wrap animate-fade-up">
            <h1 className="font-display italic text-xl sm:text-2xl font-medium text-balance">
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
            className="mt-4 flex flex-col sm:flex-row gap-2 bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl sm:rounded-full p-2 max-w-2xl shadow-glow animate-fade-up [animation-delay:80ms]"
          >
            <input
              name="q"
              placeholder="Where to? e.g. Chamonix"
              className="flex-1 bg-transparent px-4 py-3 text-white placeholder-white/50 outline-none"
            />
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
            {featured.map((listing) => {
              const topSlug = listing.category.parent?.slug ?? listing.category.slug;
              return (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="card overflow-hidden block group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
                >
                  {listing.photos[0] ? (
                    <img
                      src={listing.photos[0].url}
                      alt=""
                      className="w-full aspect-[4/3] object-cover"
                    />
                  ) : (
                    <CategoryArt topSlug={topSlug} className="w-full aspect-[4/3]" />
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="tag">{listing.category.name}</span>
                      {listing.boosted && <span className="tag tag-warm">Featured</span>}
                    </div>
                    <h3 className="font-display text-lg font-medium text-ink group-hover:text-ember transition-colors text-balance">
                      {listing.title}
                    </h3>
                    <p className="text-sm text-slate mt-1">{listing.location}</p>
                    <div className="flex items-center justify-between mt-4 text-sm">
                      <span className="font-bold font-body tabular-nums">
                        {listing.price ? `€${listing.price}` : "Free"}
                      </span>
                      {listing.owner.ratingCount > 0 && (
                        <span className="text-slate flex items-center gap-1">
                          <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-gold">
                            <path d="M10 1l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L10 15l-5.6 3.1 1.4-6.3L1 7.5l6.4-.6z" />
                          </svg>
                          {listing.owner.avgRating.toFixed(1)} ({listing.owner.ratingCount})
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
