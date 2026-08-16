"use client";

import dynamic from "next/dynamic";
import type { MapListing } from "./SearchMapInner";

// MapLibre GL touches `window` at import time, so it can only load once mounted in the browser.
const SearchMapInner = dynamic(() => import("./SearchMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-sm text-slate bg-line/40">Loading map…</div>
  ),
});

export default function SearchMap(props: {
  listings: MapListing[];
  center: [number, number];
  picked: [number, number] | null;
  pickedLabel?: string | null;
  radiusKm: number | null;
}) {
  return <SearchMapInner {...props} />;
}
