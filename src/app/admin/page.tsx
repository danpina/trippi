import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { adminModerateAction, dismissReportAction } from "@/app/actions";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Moderation" };

export default async function AdminPage() {
  const [flagged, pending, rawReports] = await Promise.all([
    db.listing.findMany({
      where: { moderationStatus: "flagged" },
      orderBy: { createdAt: "desc" },
      include: { owner: true, category: true },
    }),
    db.listing.findMany({
      where: { moderationStatus: "pending" },
      orderBy: { createdAt: "desc" },
      include: { owner: true, category: true },
    }),
    db.report.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { reporter: true },
    }),
  ]);

  // Report targets are polymorphic (listing | user) rather than a real FK, so resolve a
  // human-readable label per report separately instead of a join.
  const reports = await Promise.all(
    rawReports.map(async (r) => {
      let targetLabel = r.targetId;
      let targetHref: string | null = null;
      let manageHref: string | null = null;
      if (r.targetType === "listing") {
        const l = await db.listing.findUnique({ where: { id: r.targetId } });
        targetLabel = l?.title ?? "(listing no longer exists)";
        targetHref = l ? `/listings/${l.id}` : null;
        manageHref = l ? `/admin/listings?q=${encodeURIComponent(l.title)}` : null;
      } else if (r.targetType === "user") {
        const u = await db.user.findUnique({ where: { id: r.targetId } });
        targetLabel = u?.name ?? "(user no longer exists)";
        targetHref = u ? `/users/${u.id}` : null;
        manageHref = u ? `/admin/users/${u.id}` : null;
      }
      return { ...r, targetLabel, targetHref, manageHref };
    })
  );

  return (
    <div className="space-y-12">
      <p className="text-sm text-slate">
        Listings the rule engine flagged land here for a human call, rather than being auto-rejected. To browse or
        change anything else, use the Listings and Users tabs.
      </p>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-bold text-ink">Flagged by rules</h2>
          <span className="tag tag-ember">{flagged.length}</span>
        </div>
        {flagged.length === 0 && <p className="text-sm text-slate">Nothing flagged right now.</p>}
        <div className="space-y-3">
          {flagged.map((l) => (
            <div key={l.id} className="card p-5">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="min-w-0">
                  <Link href={`/listings/${l.id}`} className="font-display font-medium text-lg hover:text-ember">
                    {l.title}
                  </Link>
                  <div className="text-sm text-slate">
                    {l.category.name} · by{" "}
                    <Link href={`/admin/users/${l.ownerId}`} className="hover:text-ember underline underline-offset-2">
                      {l.owner.name}
                    </Link>{" "}
                    · {l.location}
                  </div>
                  <div className="text-sm text-ember-deep mt-2">{l.moderationNotes}</div>
                </div>
                <form action={adminModerateAction} className="flex gap-2 shrink-0">
                  <input type="hidden" name="listingId" value={l.id} />
                  <button name="decision" value="approve" className="btn-secondary">
                    Approve
                  </button>
                  <button name="decision" value="reject" className="btn-primary !bg-ember-deep !shadow-none">
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-bold text-ink">Pending</h2>
          <span className="tag">{pending.length}</span>
        </div>
        {pending.length === 0 && <p className="text-sm text-slate">Nothing pending.</p>}
        <div className="space-y-3">
          {pending.map((l) => (
            <div key={l.id} className="card p-5 flex justify-between items-center gap-4 flex-wrap">
              <div>
                <Link href={`/listings/${l.id}`} className="font-display font-medium text-lg hover:text-ember">
                  {l.title}
                </Link>
                <div className="text-sm text-slate">
                  {l.category.name} · by {l.owner.name}
                </div>
              </div>
              <form action={adminModerateAction} className="flex gap-2">
                <input type="hidden" name="listingId" value={l.id} />
                <button name="decision" value="approve" className="btn-primary">
                  Publish
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-bold text-ink">Open reports</h2>
          <span className="tag">{reports.length}</span>
        </div>
        {reports.length === 0 && <p className="text-sm text-slate">No open reports.</p>}
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="text-sm min-w-0">
                  <span className="tag tag-warm">{r.targetType}</span>{" "}
                  {r.targetHref ? (
                    <a href={r.targetHref} className="font-semibold text-ink hover:text-ember">
                      {r.targetLabel}
                    </a>
                  ) : (
                    <span className="font-semibold text-ink">{r.targetLabel}</span>
                  )}
                  <div className="text-slate mt-1">{r.reason}</div>
                  <div className="text-xs text-slate mt-1">
                    reported by {r.reporter.name} · {formatDate(r.createdAt)}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {r.manageHref && (
                    <Link href={r.manageHref} className="btn-secondary !py-1.5 !px-3 text-xs">
                      Manage
                    </Link>
                  )}
                  <form action={dismissReportAction}>
                    <input type="hidden" name="reportId" value={r.id} />
                    <button className="btn-secondary !py-1.5 !px-3 text-xs">Dismiss</button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
