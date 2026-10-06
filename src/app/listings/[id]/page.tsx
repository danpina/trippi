import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { contactOwnerAction } from "@/app/actions";
import CategoryArt from "@/components/CategoryArt";
import ReportForm from "@/components/ReportForm";
import SaveButton from "@/components/SaveButton";
import TrustedBadge from "@/components/TrustedBadge";
import { isTrustedHost } from "@/lib/trust";
import { tripMeta } from "@/lib/dates";

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
          <div className="grid grid-cols-2 gap-1 max-h-[26rem] overflow-hidden">
            <img src={listing.photos[0].url} alt="" className="w-full h-full object-cover" />
            <div className="grid grid-rows-2 gap-1">
              {listing.photos.slice(1, 3).map((p) => (
                <img key={p.id} src={p.url} alt="" className="w-full h-full object-cover" />
              ))}
            </div>
          </div>
        ) : (
          <CategoryArt topSlug={topSlug} seed={listing.id} className="w-full h-72" />
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {listing.moderationStatus !== "published" && (isOwner || user?.isAdmin) && (
          <div className="card border-ember-deep/30 bg-ember-soft p-4 mb-6 text-sm">
            <strong>Status: {listing.moderationStatus}.</strong>{" "}
            {listing.moderationStatus === "pending" && "Waiting on the moderation queue — only you and admins can see this."}
            {listing.moderationStatus === "flagged" && `Flagged for review: ${listing.moderationNotes}`}
            {listing.moderationStatus === "rejected" && "This listing was rejected by an admin and is not public."}
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
            <div className="mt-1 font-bold font-display text-lg">
              {new Date(listing.dateStart).toLocaleDateString()} – {new Date(listing.dateEnd).toLocaleDateString()}
            </div>
            <div className="text-xs font-body font-semibold text-slate mt-0.5">
              {tripMeta(listing.dateStart, listing.dateEnd).lengthLabel} ·{" "}
              {tripMeta(listing.dateStart, listing.dateEnd).aheadLabel}
            </div>
          </div>
          <div className="card p-4">
            <div className="eyebrow text-slate">Price</div>
            <div className="mt-1 font-bold font-display text-lg tabular-nums">
              {listing.price ? `€${listing.price}` : "Free"}
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

        <div className="card p-5 mt-10 flex items-center justify-between">
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
        </div>

        {!isOwner && (
          <div className="mt-6">
            {user ? (
              <form action={contactOwnerAction} className="card p-5">
                <input type="hidden" name="listingId" value={listing.id} />
                <label className="eyebrow text-slate">Message the host</label>
                <textarea
                  name="message"
                  required
                  rows={3}
                  className="input mt-1.5"
                  placeholder="Hi! Is this still available? I'd love to..."
                />
                <button className="btn-primary mt-3">Contact</button>
                <p className="text-xs text-slate mt-3">
                  Meeting up or arranging payment?{" "}
                  <a href="/safety" className="text-ember font-semibold hover:underline">
                    Read our safety tips
                  </a>
                  .
                </p>
                <p className="text-xs text-slate mt-1.5">
                  TripSwap only connects you two — we take no responsibility for what's arranged here. See our{" "}
                  <a href="/terms" className="text-ember font-semibold hover:underline">
                    terms &amp; disclaimer
                  </a>
                  .
                </p>
              </form>
            ) : (
              <div className="card p-5 text-sm">
                <a href="/login" className="text-ember font-bold hover:underline">
                  Log in
                </a>{" "}
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
