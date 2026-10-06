import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isThreadUnread } from "@/lib/unread";
import { formatDate, formatDateTime } from "@/lib/format";
import { deleteRatingAction, submitRatingAction } from "@/app/actions";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/messages");

  const rows = await db.thread.findMany({
    where: { OR: [{ initiatorId: user.id }, { ownerId: user.id }] },
    include: {
      listing: true,
      initiator: true,
      owner: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const myRatings = await db.rating.findMany({
    where: { raterId: user.id },
    orderBy: { createdAt: "desc" },
    include: { ratee: { select: { id: true, name: true } }, thread: { include: { listing: { select: { title: true } } } } },
  });

  // Newest activity first (a thread's own createdAt says nothing about its latest message).
  const threads = rows
    .map((t) => ({ t, last: t.messages[0]?.createdAt ?? t.createdAt }))
    .sort((a, b) => b.last.getTime() - a.last.getTime());

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <h1 className="font-display italic text-3xl text-ink mb-7">Messages</h1>
      {threads.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-slate text-sm">
            No conversations yet.{" "}
            <Link href="/search" className="text-ember font-bold hover:underline">
              Find something and say hi
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map(({ t, last }) => {
            const other = t.initiatorId === user.id ? t.owner : t.initiator;
            const unread = isThreadUnread(t, user.id);
            return (
              <Link
                key={t.id}
                href={`/messages/${t.id}`}
                className="card p-4 sm:p-5 flex justify-between items-center gap-3 sm:gap-4 hover:border-ember/40 hover:shadow-card-hover transition-all"
              >
                <div className="min-w-0">
                  <div className={`font-display text-base sm:text-lg ${unread ? "font-bold" : "font-medium"}`}>{t.listing.title}</div>
                  <div className="text-sm text-slate">with {other.name}</div>
                  {t.messages[0] && (
                    <div className={`text-sm truncate max-w-md mt-1 ${unread ? "text-ink font-semibold" : "text-slate"}`}>
                      {t.messages[0].body}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {unread && <span className="inline-block h-2.5 w-2.5 rounded-full bg-ember" aria-label="Unread" />}
                  <div className="text-xs text-slate mt-1">{formatDateTime(last)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <section id="ratings" className="mt-14 scroll-mt-24">
        <h2 className="font-display italic text-2xl text-ink mb-1">Your ratings</h2>
        <p className="text-sm text-slate mb-5">Ratings you&apos;ve given. You can change or delete them any time.</p>
        {myRatings.length === 0 ? (
          <div className="card p-6 text-sm text-slate">
            You haven&apos;t rated anyone yet. Once you and the other person have both replied in a conversation, you can rate them there.
          </div>
        ) : (
          <div className="space-y-3">
            {myRatings.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link href={`/users/${r.ratee.id}`} className="font-semibold text-ink hover:text-ember">
                      {r.ratee.name}
                    </Link>
                    <div className="text-xs text-slate truncate">{r.thread.listing.title}</div>
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
                  <form action={submitRatingAction} className="space-y-3 mt-3">
                    <input type="hidden" name="threadId" value={r.threadId} />
                    <div className="flex gap-3">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <label key={n} className="flex flex-col items-center gap-1 text-xs text-slate cursor-pointer">
                          <input type="radio" name="score" value={n} defaultChecked={r.score === n} required className="accent-ember" />
                          {n}★
                        </label>
                      ))}
                    </div>
                    <textarea
                      name="comment"
                      defaultValue={r.comment ?? ""}
                      rows={2}
                      maxLength={1000}
                      className="input"
                      placeholder="Optional note about the experience"
                      aria-label="Rating comment"
                    />
                    <button className="btn-primary !py-2 !px-4 text-xs">Save changes</button>
                  </form>
                </details>
                <form action={deleteRatingAction} className="mt-2">
                  <input type="hidden" name="ratingId" value={r.id} />
                  <button className="text-sm text-slate hover:text-ember-deep underline underline-offset-2">Delete rating</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
