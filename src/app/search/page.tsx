import Link from "next/link";
import { db } from "@/lib/db";
import { distanceKm } from "@/lib/geo";
import CategoryArt from "@/components/CategoryArt";
import SearchMap from "@/components/SearchMap";
import ResultsViewToggle from "@/components/ResultsViewToggle";
import LocationPicker from "@/components/LocationPicker";

type SearchParams = {
  q?: string;
  category?: string | string[];
  dateFrom?: string;
  dateTo?: string;
  priceMax?: string;
  lat?: string;
  lng?: string;
  radius?: string;
  locationLabel?: string;
};

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

async function resolveCategoryIds(slugs: string[]) {
  if (!slugs.length) return null;
  const cats = await db.category.findMany({ where: { slug: { in: slugs } }, include: { children: true } });
  const ids = new Set<string>();
  for (const c of cats) {
    ids.add(c.id);
    // Selecting a top-level topic pulls in every subtopic under it; selecting a specific
    // subtopic on its own keeps the filter narrow.
    if (!c.parentId) c.children.forEach((ch) => ids.add(ch.id));
  }
  return ids.size ? [...ids] : null;
}

const RADIUS_OPTIONS = [10, 25, 50, 100, 250];

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const selectedSlugs = toArray(searchParams.category);
  const categoryIds = await resolveCategoryIds(selectedSlugs);
  const categories = await db.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    include: { children: { orderBy: { name: "asc" } } },
  });

  const where: any = {
    moderationStatus: "published",
    status: "active",
  };
  if (categoryIds) where.categoryId = { in: categoryIds };
  if (searchParams.q) {
    where.OR = [
      { title: { contains: searchParams.q, mode: "insensitive" } },
      { description: { contains: searchParams.q, mode: "insensitive" } },
      { location: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }
  if (searchParams.dateFrom) where.dateEnd = { gte: new Date(searchParams.dateFrom) };
  if (searchParams.dateTo) where.dateStart = { lte: new Date(searchParams.dateTo) };
  if (searchParams.priceMax) {
    where.AND = [...(where.AND || []), { OR: [{ price: null }, { price: { lte: Number(searchParams.priceMax) } }] }];
  }

  let listings = await db.listing.findMany({
    where,
    orderBy: [{ boosted: "desc" }, { createdAt: "desc" }],
    include: { category: { include: { parent: true } }, owner: true, photos: { take: 1 } },
    take: 60,
  });

  const lat = searchParams.lat ? Number(searchParams.lat) : null;
  const lng = searchParams.lng ? Number(searchParams.lng) : null;
  const radius = searchParams.radius ? Number(searchParams.radius) : null;

  let withDistance = listings.map((l) => ({
    ...l,
    distance: lat != null && lng != null && l.lat != null && l.lng != null ? distanceKm(lat, lng, l.lat, l.lng) : null,
  }));

  if (lat != null && lng != null && radius) {
    withDistance = withDistance.filter((l) => l.distance == null || l.distance <= radius);
  }
  if (lat != null && lng != null) {
    withDistance.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }

  const geoListings = withDistance.filter((l) => l.lat != null && l.lng != null);
  const mapListings = geoListings.map((l) => ({
    id: l.id,
    title: l.title,
    lat: l.lat as number,
    lng: l.lng as number,
    price: l.price,
    location: l.location,
    topSlug: l.category.parent?.slug ?? l.category.slug,
  }));

  const picked: [number, number] | null = lat != null && lng != null ? [lat, lng] : null;
  const mapCenter: [number, number] = picked
    ? picked
    : geoListings.length > 0
      ? [
          geoListings.reduce((s, l) => s + (l.lat as number), 0) / geoListings.length,
          geoListings.reduce((s, l) => s + (l.lng as number), 0) / geoListings.length,
        ]
      : [46.8, 8.2]; // fallback: roughly the Alps

  const listPanel = (
    <div>
      {withDistance.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-slate text-sm">No listings match those filters yet. Try widening the date range or radius.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {withDistance.map((listing) => {
            const topSlug = listing.category.parent?.slug ?? listing.category.slug;
            return (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="card overflow-hidden block group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
              >
                {listing.photos[0] ? (
                  <img src={listing.photos[0].url} alt="" className="w-full aspect-[4/3] object-cover" />
                ) : (
                  <CategoryArt topSlug={topSlug} className="w-full aspect-[4/3]" />
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="tag">{listing.category.name}</span>
                    {listing.listingType === "plan" && <span className="tag tag-warm">Plan</span>}
                  </div>
                  <h3 className="font-display text-lg font-medium text-ink group-hover:text-ember transition-colors text-balance">
                    {listing.title}
                  </h3>
                  <p className="text-sm text-slate mt-1">
                    {listing.location}
                    {listing.distance != null && ` · ${listing.distance.toFixed(0)} km away`}
                  </p>
                  <div className="flex items-center justify-between mt-4 text-sm">
                    <span className="font-bold tabular-nums">{listing.price ? `€${listing.price}` : "Free"}</span>
                    <span className="text-slate tabular-nums">
                      {new Date(listing.dateStart).toLocaleDateString()} –{" "}
                      {new Date(listing.dateEnd).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );

  const mapPanel = (
    <SearchMap
      listings={mapListings}
      center={mapCenter}
      picked={picked}
      pickedLabel={searchParams.locationLabel}
      radiusKm={radius}
    />
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-[300px_1fr] gap-10">
      <aside className="space-y-5">
        <h2 className="font-display italic text-xl text-ink">Filters</h2>
        <form method="GET" className="space-y-5 card p-5">
          <div>
            <label className="eyebrow text-slate">Search</label>
            <input name="q" defaultValue={searchParams.q} placeholder="Keyword…" className="input mt-1.5" />
          </div>

          <div>
            <label className="eyebrow text-slate">Location</label>
            <LocationPicker
              defaultLabel={searchParams.locationLabel}
              defaultLat={searchParams.lat}
              defaultLng={searchParams.lng}
            />
            <select name="radius" defaultValue={searchParams.radius || ""} className="input mt-2">
              <option value="">Any distance</option>
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  Within {r} km
                </option>
              ))}
            </select>
            <p className="text-xs text-slate mt-1.5">Or click anywhere on the map to drop a point there.</p>
          </div>

          <div>
            <label className="eyebrow text-slate">Activities</label>
            <div className="mt-1.5 border border-line rounded-xl divide-y divide-line max-h-72 overflow-y-auto">
              {categories.map((top) => (
                <details key={top.id} open={selectedSlugs.some((s) => s === top.slug || top.children.some((c) => c.slug === s))}>
                  <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm font-semibold text-ink hover:bg-mist list-none [&::-webkit-details-marker]:hidden">
                    <input
                      type="checkbox"
                      name="category"
                      value={top.slug}
                      defaultChecked={selectedSlugs.includes(top.slug)}
                      className="accent-ember"
                    />
                    {top.name}
                    <span className="ml-auto text-slate">{top.children.length}</span>
                  </summary>
                  <div className="pb-1.5">
                    {top.children.map((sub) => (
                      <label
                        key={sub.id}
                        className="flex items-center gap-2 px-3 py-1.5 pl-8 text-sm text-ink/85 hover:bg-mist cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          name="category"
                          value={sub.slug}
                          defaultChecked={selectedSlugs.includes(sub.slug)}
                          className="accent-ember"
                        />
                        {sub.name}
                      </label>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="eyebrow text-slate">From</label>
              <input type="date" name="dateFrom" defaultValue={searchParams.dateFrom} className="input mt-1.5" />
            </div>
            <div>
              <label className="eyebrow text-slate">To</label>
              <input type="date" name="dateTo" defaultValue={searchParams.dateTo} className="input mt-1.5" />
            </div>
          </div>
          <div>
            <label className="eyebrow text-slate">Max price (€)</label>
            <input type="number" name="priceMax" defaultValue={searchParams.priceMax} className="input mt-1.5" />
          </div>
          <button className="btn-primary w-full">Apply filters</button>
        </form>
      </aside>

      <div>
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-slate">
            <span className="font-bold text-ink tabular-nums">{withDistance.length}</span> result
            {withDistance.length === 1 ? "" : "s"}
          </p>
        </div>

        <ResultsViewToggle list={listPanel} map={mapPanel} />
      </div>
    </div>
  );
}
