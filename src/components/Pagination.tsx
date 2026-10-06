import Link from "next/link";

// Server component: plain links that keep every other query param, so filters, sort and
// location all survive paging.
export default function Pagination({
  page,
  pageCount,
  params,
}: {
  page: number;
  pageCount: number;
  params: Record<string, string | string[] | undefined>;
}) {
  if (pageCount <= 1) return null;

  function href(p: number) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === "page" || v === undefined || v === "") continue;
      for (const item of Array.isArray(v) ? v : [v]) sp.append(k, item);
    }
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/search${qs ? `?${qs}` : ""}`;
  }

  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const list = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 mt-10 text-sm">
      {page > 1 && (
        <Link href={href(page - 1)} className="btn-secondary !py-2 !px-3.5 text-xs">
          ← Previous
        </Link>
      )}
      {list.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - list[i - 1] > 1 && <span className="text-slate">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={
              p === page
                ? "btn-primary !py-2 !px-3.5 text-xs"
                : "btn-secondary !py-2 !px-3.5 text-xs"
            }
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pageCount && (
        <Link href={href(page + 1)} className="btn-secondary !py-2 !px-3.5 text-xs">
          Next →
        </Link>
      )}
    </nav>
  );
}
