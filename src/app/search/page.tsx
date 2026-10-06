import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { distanceKm } from "@/lib/geo";
import { todayUtc } from "@/lib/dates";
import { parseDay } from "@/lib/listingForm";
import SearchMap from "@/components/SearchMap";
import ResultsViewToggle from "@/components/ResultsViewToggle";
import LocationPicker from "@/components/LocationPicker";
import DateQuickPicks from "@/components/DateQuickPicks";
import ListingCard from "@/components/ListingCard";
import SortSelect from "@/components/SortSelect";
import Pagination from "@/components/Pagination";
import MobileFilters from "@/components/MobileFilters";
import ClearableDate from "@/components/ClearableDate";

export const metadata: Metadata = {
  title: "Search spare bookings & weekend plans",
  description: "Filter by activity, dates, price and distance to find a last-minute spare booking or plan.",
};

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
  sort?: string;
  page?: string;
};

// Listings are filtered and sorted in memory (distance needs it anyway), so the query is
// capped. Past this many matches the list is truncated and the count reads "N+".
const MAX_FETCH = 500;
const PAGE_SIZE = 24;
const SORT_KEYS = ["price", "distance", "rating", "date"];

type Sortable = {
  price: number | null;
  distance: number | null;
  owner: { avgRating: number; ratingCount: number };
  dateStart: Date;
};

// Null-safe comparator per sort key — distance/rating can be missing (no point picked yet,
// host has no ratings), and those should sink to the end rather than winning ties by accident.
function compareBy(key: string, a: Sortable, b: Sortable) {
  if (key === "price") return (a.price ?? 0) - (b.price ?? 0);
  if (key === "distance") {
    if (a.distance == null && b.distance == null) return 0;
    if (a.distance == null) return 1;
    if (b.distance == null) return -1;
    return a.distance - b.distance;
  }
  if (key === "rating") {
    const av = a.owner.ratingCount > 0 ? a.owner.avgRating : -1;
    const bv = b.owner.ratingCount > 0 ? b.owner.avgRating : -1;
    return av - bv;
  }
  if (key === "date") return a.dateStart.getTime() - b.dateStart.getTime();
  return 0;
}

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function finite(v: string | undefined): number | null {
  if (v === undefined || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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

export default async function SearchPage(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const selectedSlugs = toArray(searchParams.category);
  const categoryIds = await resolveCategoryIds(selectedSlugs);
  const categories = await db.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    include: { children: { orderBy: { name: "asc" } } },
  });

  // Every URL param is user input: anything malformed is ignored rather than passed to the
  // database (which used to 500 on e.g. ?priceMax=abc).
  const q = (searchParams.q || "").trim().slice(0, 100);
  const priceMax = finite(searchParams.priceMax);
  const dateFrom = searchParams.dateFrom ? parseDay(searchParams.dateFrom) : null;
  const dateTo = searchParams.dateTo ? parseDay(searchParams.dateTo) : null;
  const latRaw = finite(searchParams.lat);
  const lngRaw = finite(searchParams.lng);
  const lat = latRaw != null && lngRaw != null && Math.abs(latRaw) <= 90 && Math.abs(lngRaw) <= 180 ? latRaw : null;
  const lng = lat != null ? lngRaw : null;
  const radiusRaw = finite(searchParams.radius);
  const radius = radiusRaw != null && radiusRaw > 0 ? radiusRaw : null;
  const [sortKey, sortDir] = (searchParams.sort || "").split("-");
  const sort = SORT_KEYS.includes(sortKey) && (sortDir === "asc" || sortDir === "desc") ? `${sortKey}-${sortDir}` : "";

  const where: any = { moderationStatus: "published", status: "active" };
  if (categoryIds) where.categoryId = { in: categoryIds };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
    ];
  }
  // Always exclude listings whose dates have already passed, even if the caller doesn't set
  // a "from" date — an already-expired listing is never a useful search result.
  const today = todayUtc();
  where.dateEnd = { gte: dateFrom && dateFrom > today ? dateFrom : today };
  if (dateTo) where.dateStart = { lte: dateTo };
  if (priceMax != null) where.AND = [{ OR: [{ price: null }, { price: { lte: priceMax } }] }];

  const user = await getCurrentUser();
  // Your own listings are never a useful search result — they live under "My listings".
  if (user) where.ownerId = { not: user.id };

  const listings = await db.listing.findMany({
    where,
    orderBy: [{ boosted: "desc" }, { createdAt: "desc" }],
    include: { category: { include: { parent: true } }, owner: true, photos: { orderBy: { sortOrder: "asc" }, take: 1 } },
    take: MAX_FETCH,
  });

  let results = listings.map((l) => ({
    ...l,
    distance: lat != null && lng != null && l.lat != null && l.lng != null ? distanceKm(lat, lng, l.lat, l.lng) : null,
  }));

  // With a radius set, a listing with no coordinates can't be shown to be inside it.
  if (lat != null && lng != null && radius) {
    results = results.filter((l) => l.distance != null && l.distance <= radius);
  }

  if (sort) {
    const [key, dir] = sort.split("-");
    const mult = dir === "desc" ? -1 : 1;
    results.sort((a, b) => mult * compareBy(key, a, b));
  } else if (lat != null && lng != null) {
    results.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }

  const activeFilters =
    (q ? 1 : 0) +
    selectedSlugs.length +
    (lat != null ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    (priceMax != null ? 1 : 0);

  const total = results.length;
  const capped = listings.length >= MAX_FETCH;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageNum = Math.min(Math.max(1, Math.floor(finite(searchParams.page) ?? 1)), pageCount);
  const pageItems = results.slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE);

  const savedIds = user
    ? new Set(
        (
          await db.savedListing.findMany({
            where: { userId: user.id, listingId: { in: pageItems.map((l) => l.id) } },
            select: { listingId: true },
          })
        ).map((s) => s.listingId)
      )
    : new Set<string>();

  const geoListings = results.filter((l) => l.lat != null && l.lng != null);
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
      {total === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-slate text-sm">No listings match those filters yet. Try widening the date range or radius.</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pageItems.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                saved={savedIds.has(listing.id)}
                showSave={!!user}
                savePath="/search"
              />
            ))}
          </div>
          <Pagination page={pageNum} pageCount={pageCount} params={searchParams} />
        </>
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
    <div className="max-w-7xl mx-auto px-6 py-6 md:py-10 grid md:grid-cols-[260px_1fr] gap-5 md:gap-8">
      <aside className="space-y-4">
        <h2 className="hidden md:block font-display italic text-xl text-ink">Filters</h2>
        <MobileFilters activeCount={activeFilters}>
        <form method="GET" className="space-y-5 card p-5">
          {/* Carry the chosen sort through a filter change (it lives outside this form). */}
          {sort && <input type="hidden" name="sort" value={sort} />}
          <div>
            <label className="eyebrow text-slate" htmlFor="f-q">
              Search
            </label>
            <input id="f-q" name="q" defaultValue={q} placeholder="Keyword…" maxLength={100} className="input mt-1.5" />
          </div>

          <div>
            <label className="eyebrow text-slate">Location</label>
            <LocationPicker
              defaultLabel={searchParams.locationLabel}
              defaultLat={searchParams.lat}
              defaultLng={searchParams.lng}
            />
            <select name="radius" defaultValue={searchParams.radius || ""} className="input mt-2" aria-label="Radius">
              <option value="">Any distance</option>
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  Within {r} km
                </option>
              ))}
            </select>
            <p className="text-xs text-slate mt-1.5">Or switch to Map view and click anywhere to drop a point.</p>
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
                      aria-label={top.name}
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

          <div>
            <label className="eyebrow text-slate">When</label>
            <div className="mt-1.5 mb-3">
              <DateQuickPicks />
            </div>
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-1 gap-2">
              <div>
                <ClearableDate key={`from-${searchParams.dateFrom || ""}`} name="dateFrom" defaultValue={searchParams.dateFrom} label="From date" />
              </div>
              <div>
                <ClearableDate key={`to-${searchParams.dateTo || ""}`} name="dateTo" defaultValue={searchParams.dateTo} label="To date" />
              </div>
            </div>
          </div>
          <div>
            <label className="eyebrow text-slate" htmlFor="f-price">
              Max price (€)
            </label>
            <input id="f-price" type="number" min={0} name="priceMax" defaultValue={searchParams.priceMax} className="input mt-1.5" />
          </div>
          <button className="btn-primary w-full">Apply filters</button>
        </form>
        </MobileFilters>
      </aside>

      <div>
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-sm text-slate">
            <span className="font-bold text-ink tabular-nums">
              {total}
              {capped ? "+" : ""}
            </span>{" "}
            result{total === 1 && !capped ? "" : "s"}
          </p>
          <SortSelect defaultValue={sort} />
        </div>

        <ResultsViewToggle list={listPanel} map={mapPanel} />
      </div>
    </div>
  );
}
