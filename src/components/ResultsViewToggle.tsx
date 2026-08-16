"use client";

import { useState } from "react";

export default function ResultsViewToggle({ list, map }: { list: React.ReactNode; map: React.ReactNode }) {
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <div>
      <div className="flex md:hidden gap-2 mb-4">
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

      <div className="grid lg:grid-cols-[1fr_440px] gap-6 items-start">
        <div className={view === "map" ? "hidden md:block" : "block"}>{list}</div>
        <div
          className={
            (view === "list" ? "hidden md:block" : "block") +
            " h-[70vh] md:h-[calc(100vh-9rem)] md:sticky md:top-20 rounded-2xl overflow-hidden border border-line shadow-card"
          }
        >
          {map}
        </div>
      </div>
    </div>
  );
}
