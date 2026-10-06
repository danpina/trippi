import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { adminModerateAction, setListingStatusAction } from "@/app/actions";
import { adminDeleteListingAction } from "@/app/admin/actions";
import Pagination from "@/components/Pagination";
import { todayUtc } from "@/lib/dates";
import { formatDateRange, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Admin · Listings" };

const PAGE_SIZE = 25;
const FILTERS = [
  { value: "", label: "All" },
  { value: "published", label: "Published" },
  { value: "flagged", label: "Flagged" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
  { value: "removed", label: "Removed" },
  { value: "expired", label: "Expired" },
];

type Params = { q?: string; filter?: string; page?: string };

export default async function AdminListingsPage(props: { searchParams: Promise<Params> }) {
  const sp = await props.searchParams;
  const q = (sp.q || "").trim().slice(0, 100);
  const filter = FILTERS.some((f) => f.value === sp.filter) ? sp.filter || "" : "";
  const today = todayUtc();

  const where: any = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { owner: { name: { contains: q, mode: "insensitive" } } },
      { owner: { email: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (["published", "flagged", "pending", "rejected"].includes(filter)) where.moderationStatus = filter;
  if (filter === "removed") where.status = "closed";
  if (filter === "expired") where.dateEnd = { lt: today };

  const total = await db.listing.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(Number(sp.page) || 1)), pageCount);

  const listings = await db.listing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { owner: true, category: true, _count: { select: { photos: true, threads: true } } },
  });

  const back = `/admin/listings${q || filter || page > 1 ? `?${new URLSearchParams({ ...(q ? { q } : {}), ...(filter ? { filter } : {}), ...(page > 1 ? { page: String(page) } : {}) })}` : ""}`;

  return (
    <div>
      <form method="GET" className="flex flex-wrap gap-2 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title, place, description, owner…"
          className="input flex-1 min-w-[14rem]"
          aria-label="Search listings"
        />
        <select name="filter" defaultValue={filter} className="input !w-auto" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <button className="btn-primary">Search</button>
      </form>

      <p className="text-sm text-slate mb-4">
        <span className="font-bold text-ink tabular-nums">{total}</span> listing{total === 1 ? "" : "s"}
      </p>

      {listings.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate">No listings match.</div>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => {
            const expired = l.dateEnd < today;
            return (
              <div key={l.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className={l.moderationStatus === "published" ? "tag" : "tag tag-ember"}>{l.moderationStatus}</span>
                  {l.status === "closed" && <span className="tag">removed</span>}
                  {expired && <span className="tag tag-warm">expired</span>}
                  <span className="tag tag-warm">{l.listingType}</span>
                </div>
                <Link href={`/listings/${l.id}`} className="font-display font-medium text-lg hover:text-ember">
                  {l.title}
                </Link>
                <div className="text-sm text-slate mt-1">
                  {l.category.name} · {l.location} · {formatDateRange(l.dateStart, l.dateEnd)} ·{" "}
                  {formatPrice(l.price, l.currency)}
                </div>
                <div className="text-xs text-slate mt-1">
                  by{" "}
                  <Link href={`/admin/users/${l.ownerId}`} className="underline underline-offset-2 hover:text-ember">
                    {l.owner.name}
                  </Link>{" "}
                  ({l.owner.email}) · {l._count.photos} photo{l._count.photos === 1 ? "" : "s"} · {l._count.threads} conversation
                  {l._count.threads === 1 ? "" : "s"}
                </div>
                {l.moderationNotes && <div className="text-sm text-ember-deep mt-2">{l.moderationNotes}</div>}

                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <Link href={`/listings/${l.id}/edit`} className="btn-secondary !py-1.5 !px-3 text-xs">
                    Edit
                  </Link>
                  <form action={adminModerateAction}>
                    <input type="hidden" name="listingId" value={l.id} />
                    {l.moderationStatus !== "published" && (
                      <button name="decision" value="approve" className="btn-secondary !py-1.5 !px-3 text-xs">
                        Approve
                      </button>
                    )}
                  </form>
                  {l.moderationStatus !== "rejected" && (
                    <form action={adminModerateAction}>
                      <input type="hidden" name="listingId" value={l.id} />
                      <button name="decision" value="reject" className="btn-secondary !py-1.5 !px-3 text-xs">
                        Reject
                      </button>
                    </form>
                  )}
                  <form action={setListingStatusAction}>
                    <input type="hidden" name="listingId" value={l.id} />
                    <input type="hidden" name="status" value={l.status === "active" ? "closed" : "active"} />
                    <button className="btn-secondary !py-1.5 !px-3 text-xs">
                      {l.status === "active" ? "Remove from search" : "Reactivate"}
                    </button>
                  </form>
                  <details className="ml-auto">
                    <summary className="text-xs text-ember-deep font-semibold cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:underline">
                      Delete…
                    </summary>
                    <form action={adminDeleteListingAction} className="mt-2 card p-3 text-xs space-y-2 max-w-xs">
                      <p className="text-slate">
                        Permanently deletes this listing, its photos and its {l._count.threads} conversation
                        {l._count.threads === 1 ? "" : "s"}. This can&apos;t be undone.
                      </p>
                      <input type="hidden" name="listingId" value={l.id} />
                      <input type="hidden" name="redirectTo" value={back} />
                      <button className="btn-primary !bg-ember-deep !shadow-none !py-1.5 !px-3 text-xs">Yes, delete it</button>
                    </form>
                  </details>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} pageCount={pageCount} params={{ q, filter }} basePath="/admin/listings" />
    </div>
  );
}
