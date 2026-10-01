"use client";

import { useState } from "react";

// The map used to sit in its own always-visible column beside the list, which on anything
// narrower than a big desktop squeezed the list down to 2 cards per row. It's now a toggle —
// full width either way — so the list gets the whole content column by default, and the map
// is there when you actually want it rather than permanently eating space.
export default function ResultsViewToggle({ list, map }: { list: React.ReactNode; map: React.ReactNode }) {
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView("list")}
          className={view === "list" ? "btn-primary !py-2 !px-4 text-xs" : "btn-secondary !py-2 !px-4 text-xs"}
        >
          List
        </button>
        <button
          onClick={() => setView("map")}
          className={view === "map" ? "btn-primary !py-2 !px-4 text-xs" : "btn-secondary !py-2 !px-4 text-xs"}
        >
          Map
        </button>
      </div>

      {view === "list" ? (
        list
      ) : (
        <div className="h-[70vh] rounded-2xl overflow-hidden border border-line shadow-card">{map}</div>
      )}
    </div>
  );
}
