import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { submitRatingAction } from "@/app/actions";
import MessageForm from "@/components/MessageForm";
import ReportForm from "@/components/ReportForm";
import TrustedBadge from "@/components/TrustedBadge";
import { isTrustedHost } from "@/lib/trust";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Conversation" };

export default async function ThreadPage(props: { params: Promise<{ threadId: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/messages/${params.threadId}`);

  const thread = await db.thread.findUnique({
    where: { id: params.threadId },
    include: {
      listing: true,
      initiator: true,
      owner: true,
      messages: { orderBy: { createdAt: "asc" }, include: { sender: true } },
      ratings: true,
    },
  });
  if (!thread) notFound();
  if (thread.initiatorId !== user.id && thread.ownerId !== user.id) notFound();

  // Opening the conversation marks it read for this user (drives the unread badge).
  await db.thread.update({
    where: { id: thread.id },
    data: thread.initiatorId === user.id ? { initiatorReadAt: new Date() } : { ownerReadAt: new Date() },
  });

  const other = thread.initiatorId === user.id ? thread.owner : thread.initiator;
  const distinctSenders = new Set(thread.messages.map((m) => m.senderId));
  const bothReplied = distinctSenders.has(thread.initiatorId) && distinctSenders.has(thread.ownerId);
  const myRating = thread.ratings.find((r) => r.raterId === user.id);

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <div className="mb-4">
        <Link href={`/listings/${thread.listingId}`} className="text-sm text-ember font-bold hover:underline">
          ← {thread.listing.title}
        </Link>
      </div>
      <h1 className="font-display italic text-2xl text-ink mb-1">
        Conversation with{" "}
        <Link href={`/users/${other.id}`} className="hover:text-ember">
          {other.name}
        </Link>
      </h1>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate flex items-center gap-2">
          {other.ratingCount > 0 ? (
            <>
              {isTrustedHost(other) && <TrustedBadge />}
              <span className="flex items-center gap-1">
                <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-gold">
                  <path d="M10 1l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L10 15l-5.6 3.1 1.4-6.3L1 7.5l6.4-.6z" />
                </svg>
                {other.avgRating.toFixed(1)} ({other.ratingCount} ratings)
              </span>
            </>
          ) : (
            "No ratings yet"
          )}
        </p>
        <ReportForm targetType="user" targetId={other.id} label={`Report ${other.name}`} />
      </div>

      <div className="card p-4 sm:p-5 space-y-3 sm:max-h-96 sm:overflow-y-auto">
        {thread.messages.map((m) => (
          <div key={m.id} className={m.senderId === user.id ? "text-right" : "text-left"}>
            <div
              className={
                "inline-block px-4 py-2.5 rounded-2xl text-sm max-w-[80%] text-left whitespace-pre-wrap break-words " +
                (m.senderId === user.id ? "bg-ember text-white rounded-br-sm" : "bg-glacier-soft text-ink rounded-bl-sm")
              }
            >
              {m.body}
            </div>
            <div className="text-[11px] text-slate mt-0.5">
              {m.sender.name} · {formatDateTime(m.createdAt)}
            </div>
          </div>
        ))}
        {thread.messages.length === 0 && <p className="text-sm text-slate">Say hello to get things started.</p>}
      </div>

      <MessageForm threadId={thread.id} />

      {bothReplied && myRating && (
        <div className="card p-5 mt-8 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-ink/85">
            You rated {other.name}{" "}
            <span className="text-gold font-bold" aria-label={`${myRating.score} out of 5`}>
              {"★".repeat(myRating.score)}
              <span className="text-line">{"★".repeat(5 - myRating.score)}</span>
            </span>
          </p>
          <Link href="/messages#ratings" className="text-sm text-ember font-semibold hover:underline">
            Edit or delete in Your ratings →
          </Link>
        </div>
      )}

      {bothReplied && !myRating && (
        <div className="card p-6 mt-8">
          <h2 className="font-display italic text-xl text-ink mb-1">Rate {other.name}</h2>
          <p className="text-sm text-slate mb-4">How did it go?</p>
          <form action={submitRatingAction} className="space-y-3">
            <input type="hidden" name="threadId" value={thread.id} />
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex flex-col items-center gap-1 text-xs text-slate cursor-pointer">
                  <input type="radio" name="score" value={n} required className="accent-ember" />
                  {n}★
                </label>
              ))}
            </div>
            <textarea
              name="comment"
              rows={2}
              maxLength={1000}
              className="input"
              placeholder="Optional note about the experience"
              aria-label="Rating comment"
            />
            <button className="btn-primary">Submit rating</button>
          </form>
        </div>
      )}
    </div>
  );
}
