import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/messages");

  const threads = await db.thread.findMany({
    where: { OR: [{ initiatorId: user.id }, { ownerId: user.id }] },
    orderBy: { createdAt: "desc" },
    include: {
      listing: true,
      initiator: true,
      owner: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

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
          {threads.map((t) => {
            const other = t.initiatorId === user.id ? t.owner : t.initiator;
            return (
              <Link
                key={t.id}
                href={`/messages/${t.id}`}
                className="card p-5 flex justify-between items-center block hover:border-ember/40 hover:shadow-card-hover transition-all"
              >
                <div>
                  <div className="font-display font-medium text-lg">{t.listing.title}</div>
                  <div className="text-sm text-slate">with {other.name}</div>
                  {t.messages[0] && <div className="text-sm text-slate truncate max-w-md mt-1">{t.messages[0].body}</div>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
