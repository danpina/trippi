"use client";

import { useRouter, useSearchParams } from "next/navigation";

// Local calendar date as YYYY-MM-DD. (toISOString() converts to UTC first, which in any
// timezone ahead of UTC turned "Saturday" into the Friday before.)
function fmt(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// "This weekend" means the upcoming Sat/Sun — if today already is Sat/Sun, that's this
// weekend; the calculation below rolls Sunday forward to next weekend, which is a fine
// simplification (today alone isn't much of a "weekend" to search for).
function weekend(weeksAhead: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diffToSat = ((6 - day + 7) % 7) + weeksAhead * 7;
  const sat = new Date(d);
  sat.setDate(d.getDate() + diffToSat);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return { from: sat, to: sun };
}

export default function DateQuickPicks() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function apply(from: Date | null, to: Date | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (from) params.set("dateFrom", fmt(from));
    else params.delete("dateFrom");
    if (to) params.set("dateTo", fmt(to));
    else params.delete("dateTo");
    router.push(`/search?${params.toString()}`);
  }

  const today = new Date();
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const picks: { label: string; onClick: () => void }[] = [
    {
      label: "This weekend",
      onClick: () => {
        const { from, to } = weekend(0);
        apply(from, to);
      },
    },
    {
      label: "Next weekend",
      onClick: () => {
        const { from, to } = weekend(1);
        apply(from, to);
      },
    },
    { label: "This month", onClick: () => apply(today, monthEnd) },
    { label: "Any date", onClick: () => apply(null, null) },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {picks.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={p.onClick}
          className="px-3 py-2 text-xs font-semibold rounded-full border border-line text-ink/80 hover:border-ember hover:text-ember transition-colors"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
