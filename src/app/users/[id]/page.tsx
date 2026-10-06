import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import ListingCard from "@/components/ListingCard";
import ReportForm from "@/components/ReportForm";
import TrustedBadge from "@/components/TrustedBadge";
import { isTrustedHost } from "@/lib/trust";
import { todayUtc } from "@/lib/dates";
import { formatDate } from "@/lib/format";

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const u = await db.user.findUnique({ where: { id }, select: { name: true } });
  return { title: u ? `${u.name}'s profile` : "Profile" };
}

// Public by design: only name, join date, rating and active listings — never email, age or
// gender.
export default async function PublicProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const [profile, viewer] = await Promise.all([
    db.user.findUnique({
      where: { id },
      select: { id: true, name: true, createdAt: true, avgRating: true, ratingCount: true },
    }),
    getCurrentUser(),
  ]);
  if (!profile) notFound();

  const [listings, ratings] = await Promise.all([
    db.listing.findMany({
      where: { ownerId: id, moderationStatus: "published", status: "active", dateEnd: { gte: todayUtc() } },
      orderBy: { createdAt: "desc" },
      include: { category: { include: { parent: true } }, owner: true, photos: { orderBy: { sortOrder: "asc" }, take: 1 } },
      take: 12,
    }),
    db.rating.findMany({
      where: { rateeId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { rater: { select: { name: true } } },
    }),
  ]);

  const savedIds = viewer
    ? new Set(
        (
          await db.savedListing.findMany({
            where: { userId: viewer.id, listingId: { in: listings.map((l) => l.id) } },
            select: { listingId: true },
          })
        ).map((s) => s.listingId)
      )
    : new Set<string>();

  const firstName = (full: string) => full.split(" ")[0];

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-ember to-gold flex items-center justify-center text-white font-display font-semibold text-2xl">
          {profile.name[0]}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-3xl font-medium text-ink">{profile.name}</h1>
            {isTrustedHost(profile) && <TrustedBadge />}
          </div>
          <p className="text-sm text-slate mt-1 flex items-center gap-1.5">
            {profile.ratingCount > 0 ? (
              <>
                <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-gold">
                  <path d="M10 1l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L10 15l-5.6 3.1 1.4-6.3L1 7.5l6.4-.6z" />
                </svg>
                {profile.avgRating.toFixed(1)} ({profile.ratingCount} rating{profile.ratingCount === 1 ? "" : "s"})
              </>
            ) : (
              "No ratings yet"
            )}
            <span aria-hidden>·</span>
            Member since {formatDate(profile.createdAt)}
          </p>
          {viewer && viewer.id !== profile.id && (
            <ReportForm targetType="user" targetId={profile.id} label={`Report ${firstName(profile.name)}`} />
          )}
        </div>
      </div>

      <section className="mb-12">
        <h2 className="font-display italic text-xl text-ink mb-4">Active listings</h2>
        {listings.length === 0 ? (
          <div className="card p-6 text-sm text-slate">No active listings right now.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                saved={savedIds.has(l.id)}
                showSave={!!viewer && viewer.id !== l.ownerId}
                savePath={`/users/${profile.id}`}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display italic text-xl text-ink mb-4">Recent ratings</h2>
        {ratings.length === 0 ? (
          <div className="card p-6 text-sm text-slate">No ratings yet.</div>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {ratings.map((r) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink">{firstName(r.rater.name)}</span>
                  <span className="text-gold font-bold" aria-label={`${r.score} out of 5`}>
                    {"★".repeat(r.score)}
                    <span className="text-line">{"★".repeat(5 - r.score)}</span>
                  </span>
                </div>
                {r.comment && <p className="text-sm text-ink/85 mt-1.5 whitespace-pre-wrap">{r.comment}</p>}
                <p className="text-xs text-slate mt-1.5">{formatDate(r.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
