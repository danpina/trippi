import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import CategoryArt from "@/components/CategoryArt";
import ContactForm from "@/components/ContactForm";
import Gallery from "@/components/Gallery";
import ReportForm from "@/components/ReportForm";
import SaveButton from "@/components/SaveButton";
import TrustedBadge from "@/components/TrustedBadge";
import { isTrustedHost } from "@/lib/trust";
import { todayUtc, tripMeta } from "@/lib/dates";
import { formatDateRange, formatPrice } from "@/lib/format";

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const l = await db.listing.findUnique({
    where: { id },
    select: { title: true, description: true, location: true, moderationStatus: true, photos: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  // Unpublished listings aren't public, so don't leak their text into <title>/OG tags.
  if (!l || l.moderationStatus !== "published") return { title: "Listing" };
  const description = `${l.location} — ${l.description.slice(0, 150)}${l.description.length > 150 ? "…" : ""}`;
  return {
    title: l.title,
    description,
    openGraph: { title: l.title, description, images: l.photos[0] ? [l.photos[0].url] : undefined },
  };
}

export default async function ListingDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const listing = await db.listing.findUnique({
    where: { id: params.id },
    include: {
      category: { include: { parent: true } },
      owner: true,
      photos: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!listing) notFound();

  const user = await getCurrentUser();
  const isOwner = user?.id === listing.ownerId;
  const canView = listing.moderationStatus === "published" || isOwner || user?.isAdmin;
  if (!canView) notFound();

  const saved = user
    ? !!(await db.savedListing.findUnique({
        where: { userId_listingId: { userId: user.id, listingId: listing.id } },
      }))
    : false;

  const topSlug = listing.category.parent?.slug ?? listing.category.slug;
  const meta = tripMeta(listing.dateStart, listing.dateEnd);
  const expired = listing.dateEnd < todayUtc();
  const removed = listing.status !== "active";
  const unavailable = expired || removed;

  return (
    <div>
      <div className="relative">
        {user && !isOwner && (
          <SaveButton
            listingId={listing.id}
            saved={saved}
            path={`/listings/${listing.id}`}
            className="absolute top-4 right-4 z-10"
          />
        )}
        {listing.photos.length > 0 ? (
          <Gallery photos={listing.photos.map((p) => ({ id: p.id, url: p.url }))} title={listing.title} />
        ) : (
          <CategoryArt topSlug={topSlug} seed={listing.id} className="w-full h-72" />
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {unavailable && (
          <div className="card bg-gold-soft border-gold/40 p-4 mb-6 text-sm">
            <strong>{expired ? "This listing has ended." : "This listing has been removed by its host."}</strong>{" "}
            It&apos;s no longer available to contact.
          </div>
        )}

        {listing.moderationStatus !== "published" && (isOwner || user?.isAdmin) && (
          <div className="card border-ember-deep/30 bg-ember-soft p-4 mb-6 text-sm">
            <strong>Status: {listing.moderationStatus}.</strong>{" "}
            {listing.moderationStatus === "pending" && "Waiting on the moderation queue — only you and admins can see this."}
            {listing.moderationStatus === "flagged" && `Flagged for review: ${listing.moderationNotes}`}
            {listing.moderationStatus === "rejected" && "This listing was rejected by an admin and is not public."}
          </div>
        )}

        {(isOwner || user?.isAdmin) && (
          <div className="flex gap-3 mb-4 text-sm font-semibold">
            <Link href={`/listings/${listing.id}/edit`} className="text-ember hover:underline">
              Edit listing
            </Link>
            {user?.isAdmin && (
              <>
                <Link href="/admin/listings" className="text-slate hover:text-ink hover:underline">
                  Admin: all listings
                </Link>
                <Link href={`/admin/users/${listing.ownerId}`} className="text-slate hover:text-ink hover:underline">
                  Admin: manage owner
                </Link>
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <span className="tag">{listing.category.name}</span>
          <span className="tag tag-warm">{listing.listingType === "opportunity" ? "Opportunity" : "Plan"}</span>
        </div>

        <h1 className="font-display text-4xl font-medium text-ink text-balance">{listing.title}</h1>
        <p className="text-slate mt-2">
          {listing.location}
          {listing.addressDetails && ` · ${listing.addressDetails}`}
        </p>

        <div className="grid sm:grid-cols-3 gap-4 mt-8">
          <div className="card p-4">
            <div className="eyebrow text-slate">Dates</div>
            <div className="mt-1 font-bold font-display text-lg">{formatDateRange(listing.dateStart, listing.dateEnd)}</div>
            <div className="text-xs font-body font-semibold text-slate mt-0.5">
              {meta.lengthLabel} · {meta.aheadLabel}
            </div>
          </div>
          <div className="card p-4">
            <div className="eyebrow text-slate">Price</div>
            <div className="mt-1 font-bold font-display text-lg tabular-nums">
              {formatPrice(listing.price, listing.currency)}
              {listing.priceNegotiable && (
                <span className="block text-xs font-body font-semibold text-slate mt-0.5">Negotiable</span>
              )}
            </div>
          </div>
          <div className="card p-4">
            <div className="eyebrow text-slate">Capacity</div>
            <div className="mt-1 font-bold font-display text-lg">
              {listing.capacity} spot{listing.capacity === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="font-display italic text-xl text-ink mb-3">About this {listing.listingType}</h2>
          <p className="text-ink/90 whitespace-pre-wrap leading-relaxed">{listing.description}</p>
        </div>

        {(listing.minAge || listing.maxAge || (listing.genderPreference && listing.genderPreference !== "any")) && (
          <div className="mt-6 text-sm text-slate">
            Filtering preference (not a requirement to contact):{" "}
            {listing.minAge && listing.maxAge
              ? `ages ${listing.minAge}–${listing.maxAge}`
              : listing.minAge
                ? `ages ${listing.minAge}+`
                : listing.maxAge
                  ? `up to ${listing.maxAge}`
                  : ""}
            {listing.genderPreference && listing.genderPreference !== "any" && ` · ${listing.genderPreference}`}
          </div>
        )}

        <Link
          href={`/users/${listing.owner.id}`}
          className="card p-5 mt-10 flex items-center justify-between hover:border-ember/40 hover:shadow-card-hover transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-ember to-gold flex items-center justify-center text-white font-display font-semibold text-lg">
              {listing.owner.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{listing.owner.name}</span>
                {isTrustedHost(listing.owner) && <TrustedBadge />}
              </div>
              <div className="text-sm text-slate flex items-center gap-1">
                {listing.owner.ratingCount > 0 ? (
                  <>
                    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-gold">
                      <path d="M10 1l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L10 15l-5.6 3.1 1.4-6.3L1 7.5l6.4-.6z" />
                    </svg>
                    {listing.owner.avgRating.toFixed(1)} ({listing.owner.ratingCount} rating
                    {listing.owner.ratingCount === 1 ? "" : "s"})
                  </>
                ) : (
                  "No ratings yet"
                )}
              </div>
            </div>
          </div>
          <span className="text-sm text-ember font-semibold">View profile →</span>
        </Link>

        {!isOwner && (
          <div className="mt-6">
            {unavailable ? null : user ? (
              <ContactForm listingId={listing.id} />
            ) : (
              <div className="card p-5 text-sm">
                <Link href={`/login?next=/listings/${listing.id}`} className="text-ember font-bold hover:underline">
                  Log in
                </Link>{" "}
                to contact the host — searching is open to everyone, but conversations require an account.
              </div>
            )}
            {user && <ReportForm targetType="listing" targetId={listing.id} label="Report this listing" />}
          </div>
        )}
      </div>
    </div>
  );
}
