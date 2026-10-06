import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isThreadUnread } from "@/lib/unread";
import { formatDateTime } from "@/lib/format";

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
                className="card p-5 flex justify-between items-center gap-4 hover:border-ember/40 hover:shadow-card-hover transition-all"
              >
                <div className="min-w-0">
                  <div className={`font-display text-lg ${unread ? "font-bold" : "font-medium"}`}>{t.listing.title}</div>
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
    </div>
  );
}
