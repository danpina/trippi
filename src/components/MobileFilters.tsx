"use client";

import { useState } from "react";

// On phones the filter form is long enough that it pushed every result off the first
// screens, so it collapses behind a button. From md up it is always visible.
export default function MobileFilters({ activeCount, children }: { activeCount: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="search-filters"
        className="md:hidden btn-secondary w-full flex items-center justify-between !py-3"
      >
        <span className="flex items-center gap-2">
          Filters
          {activeCount > 0 && (
            <span className="inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full bg-ember px-1.5 text-[11px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </span>
        <svg
          viewBox="0 0 20 20"
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8l5 5 5-5" />
        </svg>
      </button>
      <div id="search-filters" className={open ? "block" : "hidden md:block"}>
        {children}
      </div>
    </>
  );
}
