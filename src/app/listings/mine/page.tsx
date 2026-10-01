import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { setListingStatusAction } from "@/app/actions";
import { tripMeta } from "@/lib/dates";

const MODERATION_LABEL: Record<string, string> = {
  published: "Published",
  pending: "Pending review",
  flagged: "Flagged",
  rejected: "Rejected",
};
const MODERATION_TAG_CLASS: Record<string, string> = {
  published: "tag",
  pending: "tag",
  flagged: "tag tag-ember",
  rejected: "tag tag-ember",
};

export default async function MyListingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/listings/mine");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const listings = await db.listing.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <p className="eyebrow text-ember">Account</p>
          <h1 className="font-display text-3xl font-medium text-ink mt-1">My listings</h1>
        </div>
        <Link href="/listings/new" className="btn-primary">
          Post a listing
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-slate text-sm">
            Nothing posted yet.{" "}
            <Link href="/listings/new" className="text-ember font-semibold hover:underline">
              Post your first listing
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => {
            const expired = l.dateEnd < todayStart;
            const { lengthLabel } = tripMeta(l.dateStart, l.dateEnd);
            return (
              <div key={l.id} className="card p-5">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={MODERATION_TAG_CLASS[l.moderationStatus]}>
                        {MODERATION_LABEL[l.moderationStatus] ?? l.moderationStatus}
                      </span>
                      {expired && <span className="tag tag-warm">Expired</span>}
                      {l.status === "closed" && <span className="tag">Removed from listing</span>}
                    </div>
                    <Link href={`/listings/${l.id}`} className="font-display font-medium text-lg hover:text-ember">
                      {l.title}
                    </Link>
                    <div className="text-sm text-slate mt-1">
                      {l.category.name} · {l.location} · {new Date(l.dateStart).toLocaleDateString()} –{" "}
                      {new Date(l.dateEnd).toLocaleDateString()} ({lengthLabel})
                    </div>
                    {l.moderationStatus === "flagged" && l.moderationNotes && (
                      <div className="text-sm text-ember-deep mt-2">{l.moderationNotes}</div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/listings/${l.id}/edit`} className="btn-secondary !py-1.5 !px-3 text-xs">
                      Edit
                    </Link>
                    <form action={setListingStatusAction}>
                      <input type="hidden" name="listingId" value={l.id} />
                      <input type="hidden" name="status" value={l.status === "active" ? "closed" : "active"} />
                      <button className="btn-secondary !py-1.5 !px-3 text-xs">
                        {l.status === "active" ? "Remove" : "Reactivate"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
