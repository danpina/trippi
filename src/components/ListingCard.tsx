import Link from "next/link";
import CategoryArt from "./CategoryArt";
import SaveButton from "./SaveButton";
import TrustedBadge from "./TrustedBadge";
import { isTrustedHost } from "@/lib/trust";
import { tripMeta } from "@/lib/dates";
import { formatDateRange, formatPrice } from "@/lib/format";

export type CardListing = {
  id: string;
  title: string;
  location: string;
  price: number | null;
  currency?: string;
  priceNegotiable: boolean;
  boosted?: boolean;
  listingType?: string;
  dateStart?: Date;
  dateEnd?: Date;
  distance?: number | null;
  category: { name: string; slug: string; parent: { slug: string } | null };
  owner: { avgRating: number; ratingCount: number };
  photos: { url: string }[];
};

export default function ListingCard({
  listing,
  saved,
  showSave,
  savePath,
}: {
  listing: CardListing;
  saved: boolean;
  showSave: boolean;
  savePath: string;
}) {
  const topSlug = listing.category.parent?.slug ?? listing.category.slug;

  return (
    <div className="relative">
      {showSave && (
        <SaveButton listingId={listing.id} saved={saved} path={savePath} className="absolute top-3 right-3 z-10" />
      )}
      <Link
        href={`/listings/${listing.id}`}
        className="card overflow-hidden block group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
      >
        {listing.photos[0] ? (
          <img
            src={listing.photos[0].url}
            alt={`${listing.title} — cover photo`}
            loading="lazy"
            decoding="async"
            className="w-full aspect-[4/3] object-cover"
          />
        ) : (
          <CategoryArt topSlug={topSlug} seed={listing.id} className="w-full aspect-[4/3]" />
        )}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="tag">{listing.category.name}</span>
            {listing.boosted && <span className="tag tag-warm">Featured</span>}
            {listing.listingType === "plan" && <span className="tag tag-warm">Plan</span>}
          </div>
          <h3 className="font-display text-lg font-medium text-ink group-hover:text-ember transition-colors text-balance">
            {listing.title}
          </h3>
          <p className="text-sm text-slate mt-1">
            {listing.location}
            {listing.distance != null && ` · ${listing.distance.toFixed(0)} km away`}
          </p>
          {listing.owner.ratingCount > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              {isTrustedHost(listing.owner) && <TrustedBadge />}
              <span className="text-xs text-slate flex items-center gap-1">
                <svg viewBox="0 0 20 20" className="w-3 h-3 fill-gold">
                  <path d="M10 1l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L10 15l-5.6 3.1 1.4-6.3L1 7.5l6.4-.6z" />
                </svg>
                {listing.owner.avgRating.toFixed(1)} ({listing.owner.ratingCount})
              </span>
            </div>
          )}
          <div className="mt-4 text-sm">
            <span className="font-bold tabular-nums">
              {formatPrice(listing.price, listing.currency)}
              {listing.priceNegotiable && <span className="text-slate font-normal"> · negotiable</span>}
            </span>
            {listing.dateStart && listing.dateEnd && (
              <div className="flex items-center justify-between gap-3 mt-1 text-xs text-slate tabular-nums">
                <span>{formatDateRange(listing.dateStart, listing.dateEnd)}</span>
                {(() => {
                  const { lengthLabel, aheadLabel } = tripMeta(listing.dateStart, listing.dateEnd);
                  return (
                    <span className="text-right">
                      {lengthLabel} · {aheadLabel}
                    </span>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
