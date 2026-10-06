import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import Pagination from "@/components/Pagination";
import TrustedBadge from "@/components/TrustedBadge";
import { isTrustedHost } from "@/lib/trust";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Admin · Users" };

const PAGE_SIZE = 25;

export default async function AdminUsersPage(props: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await props.searchParams;
  const q = (sp.q || "").trim().slice(0, 100);

  const where: any = q
    ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
    : {};

  const total = await db.user.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(Number(sp.page) || 1)), pageCount);

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { _count: { select: { listings: true } } },
  });

  return (
    <div>
      <form method="GET" className="flex gap-2 mb-6">
        <input name="q" defaultValue={q} placeholder="Search name or email…" className="input flex-1" aria-label="Search users" />
        <button className="btn-primary">Search</button>
      </form>

      <p className="text-sm text-slate mb-4">
        <span className="font-bold text-ink tabular-nums">{total}</span> user{total === 1 ? "" : "s"}
      </p>

      {users.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate">No users match.</div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <Link
              key={u.id}
              href={`/admin/users/${u.id}`}
              className="card p-5 flex items-center justify-between gap-4 hover:border-ember/40 hover:shadow-card-hover transition-all"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-ink">{u.name}</span>
                  {u.isAdmin && <span className="tag tag-ember">Admin</span>}
                  {u.planTier === "pro" && <span className="tag tag-warm">Pro</span>}
                  {isTrustedHost(u) && <TrustedBadge />}
                  {u.lockedUntil && u.lockedUntil > new Date() && <span className="tag tag-ember">Locked</span>}
                </div>
                <div className="text-sm text-slate truncate">{u.email}</div>
                <div className="text-xs text-slate mt-1">
                  Joined {formatDate(u.createdAt)} · {u._count.listings} listing{u._count.listings === 1 ? "" : "s"} ·{" "}
                  {u.ratingCount > 0 ? `${u.avgRating.toFixed(1)}★ (${u.ratingCount})` : "no ratings"}
                </div>
              </div>
              <span className="text-sm text-ember font-semibold shrink-0">Manage →</span>
            </Link>
          ))}
        </div>
      )}

      <Pagination page={page} pageCount={pageCount} params={{ q }} basePath="/admin/users" />
    </div>
  );
}
