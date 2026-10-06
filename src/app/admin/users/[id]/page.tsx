import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  adminDeleteRatingAction,
  adminRecomputeRatingAction,
  adminUpdateRatingAction,
} from "@/app/admin/actions";
import { AdminDeleteUserForm, AdminUserForm } from "@/components/AdminUserForms";
import { todayUtc } from "@/lib/dates";
import { formatDate, formatDateRange } from "@/lib/format";

export const metadata: Metadata = { title: "Admin · User" };

type RatingRow = {
  id: string;
  score: number;
  comment: string | null;
  createdAt: Date;
  otherId: string;
  otherName: string;
  listingTitle: string;
};

function RatingList({ rows, emptyText }: { rows: RatingRow[]; emptyText: string }) {
  if (rows.length === 0) return <div className="card p-5 text-sm text-slate">{emptyText}</div>;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 text-sm">
              <Link href={`/admin/users/${r.otherId}`} className="font-semibold text-ink hover:text-ember">
                {r.otherName}
              </Link>
              <div className="text-xs text-slate truncate">{r.listingTitle}</div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-gold font-bold" aria-label={`${r.score} out of 5`}>
                {"★".repeat(r.score)}
                <span className="text-line">{"★".repeat(5 - r.score)}</span>
              </span>
              <div className="text-xs text-slate">{formatDate(r.createdAt)}</div>
            </div>
          </div>
          {r.comment && <p className="text-sm text-ink/85 mt-2 whitespace-pre-wrap">{r.comment}</p>}

          <details className="mt-3">
            <summary className="text-sm text-ember font-semibold cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:underline">
              Edit
            </summary>
            <form action={adminUpdateRatingAction} className="space-y-3 mt-3">
              <input type="hidden" name="ratingId" value={r.id} />
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="flex flex-col items-center gap-1 text-xs text-slate cursor-pointer">
                    <input type="radio" name="score" value={n} defaultChecked={r.score === n} required className="accent-ember" />
                    {n}★
                  </label>
                ))}
              </div>
              <textarea name="comment" defaultValue={r.comment ?? ""} rows={2} maxLength={1000} className="input" aria-label="Comment" />
              <button className="btn-primary !py-2 !px-4 text-xs">Save rating</button>
            </form>
          </details>
          <form action={adminDeleteRatingAction} className="mt-2">
            <input type="hidden" name="ratingId" value={r.id} />
            <button className="text-sm text-slate hover:text-ember-deep underline underline-offset-2">Delete rating</button>
          </form>
        </div>
      ))}
    </div>
  );
}

export default async function AdminUserPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const [admin, user] = await Promise.all([
    getCurrentUser(),
    db.user.findUnique({
      where: { id },
      include: {
        ratingsReceived: { orderBy: { createdAt: "desc" }, include: { rater: true, thread: { include: { listing: true } } } },
        ratingsGiven: { orderBy: { createdAt: "desc" }, include: { ratee: true, thread: { include: { listing: true } } } },
        listings: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    }),
  ]);
  if (!user) notFound();

  const today = todayUtc();
  const received: RatingRow[] = user.ratingsReceived.map((r) => ({
    id: r.id,
    score: r.score,
    comment: r.comment,
    createdAt: r.createdAt,
    otherId: r.raterId,
    otherName: `from ${r.rater.name}`,
    listingTitle: r.thread.listing.title,
  }));
  const given: RatingRow[] = user.ratingsGiven.map((r) => ({
    id: r.id,
    score: r.score,
    comment: r.comment,
    createdAt: r.createdAt,
    otherId: r.rateeId,
    otherName: `to ${r.ratee.name}`,
    listingTitle: r.thread.listing.title,
  }));

  return (
    <div className="space-y-12">
      <div>
        <Link href="/admin/users" className="text-sm text-ember font-bold hover:underline">
          ← All users
        </Link>
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <h2 className="font-display text-2xl font-medium text-ink">{user.name}</h2>
          {user.isAdmin && <span className="tag tag-ember">Admin</span>}
        </div>
        <p className="text-sm text-slate mt-1">
          Joined {formatDate(user.createdAt)} ·{" "}
          <Link href={`/users/${user.id}`} className="underline underline-offset-2 hover:text-ember">
            public profile
          </Link>
          {user.acceptedTermsAt ? ` · accepted terms ${formatDate(user.acceptedTermsAt)}` : " · has not accepted terms yet"}
        </p>
      </div>

      <section>
        <h3 className="font-bold text-ink mb-3">Details</h3>
        <AdminUserForm
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            age: user.age,
            gender: user.gender,
            planTier: user.planTier,
            homeLocation: user.homeLocation,
            isAdmin: user.isAdmin,
            isSelf: admin?.id === user.id,
            locked: !!user.lockedUntil && user.lockedUntil > new Date(),
          }}
        />
      </section>

      <section>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h3 className="font-bold text-ink">
            Ratings received{" "}
            <span className="text-slate font-normal text-sm">
              — {user.ratingCount > 0 ? `${user.avgRating.toFixed(2)}★ across ${user.ratingCount}` : "none yet"}
            </span>
          </h3>
          <form action={adminRecomputeRatingAction}>
            <input type="hidden" name="userId" value={user.id} />
            <button className="btn-secondary !py-1.5 !px-3 text-xs" title="Recalculate the average from the rating rows below">
              Recalculate average
            </button>
          </form>
        </div>
        {user.ratingCount > 0 && received.length === 0 && (
          <p className="text-xs text-ember-deep font-semibold mb-3">
            The stored average ({user.avgRating.toFixed(1)}★, {user.ratingCount} ratings) has no ratings behind it — it
            is leftover demo data. &quot;Recalculate average&quot; resets it to match the real ratings.
          </p>
        )}
        <RatingList rows={received} emptyText="No ratings received." />
      </section>

      <section>
        <h3 className="font-bold text-ink mb-3">Ratings given</h3>
        <RatingList rows={given} emptyText="This user hasn't rated anyone." />
      </section>

      <section>
        <h3 className="font-bold text-ink mb-3">
          Listings <span className="text-slate font-normal text-sm">— {user.listings.length}</span>
        </h3>
        {user.listings.length === 0 ? (
          <div className="card p-5 text-sm text-slate">No listings.</div>
        ) : (
          <div className="space-y-2">
            {user.listings.map((l) => (
              <div key={l.id} className="card p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex gap-2 flex-wrap mb-1">
                    <span className={l.moderationStatus === "published" ? "tag" : "tag tag-ember"}>{l.moderationStatus}</span>
                    {l.status === "closed" && <span className="tag">removed</span>}
                    {l.dateEnd < today && <span className="tag tag-warm">expired</span>}
                  </div>
                  <Link href={`/listings/${l.id}`} className="font-semibold text-ink hover:text-ember">
                    {l.title}
                  </Link>
                  <div className="text-xs text-slate">{formatDateRange(l.dateStart, l.dateEnd)}</div>
                </div>
                <Link href={`/listings/${l.id}/edit`} className="btn-secondary !py-1.5 !px-3 text-xs">
                  Edit
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <AdminDeleteUserForm userId={user.id} name={user.name} disabled={admin?.id === user.id} />
    </div>
  );
}
