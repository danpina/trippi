"use client";

import { useEffect, useRef, useState } from "react";

type Suggestion = { label: string; lat: number; lng: number };

// Nominatim (OpenStreetMap's free geocoder) is fine for this stage — light, interactive,
// user-triggered lookups are exactly what its usage policy expects. Swap for Mapbox/Google/
// LocationIQ geocoding before real production traffic; those need an API key from whoever
// owns the account.
// Soft bias toward Europe (left,top,right,bottom) — results outside this box can still show,
// they're just not favored, so a search for "Bali" still works.
const EUROPE_VIEWBOX = "-25,72,45,34";

export default function LocationPicker({
  defaultLabel,
  defaultLat,
  defaultLng,
  labelFieldName = "locationLabel",
  placeholder = "City or address, e.g. Chamonix, France",
}: {
  defaultLabel?: string;
  defaultLat?: string;
  defaultLng?: string;
  labelFieldName?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(defaultLabel || "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Suggestion | null>(
    defaultLabel && defaultLat && defaultLng
      ? { label: defaultLabel, lat: Number(defaultLat), lng: Number(defaultLng) }
      : null
  );
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (picked && query === picked.label) return; // just selected, don't re-search
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}&viewbox=${EUROPE_VIEWBOX}`,
          { signal: controller.signal, headers: { Accept: "application/json" } }
        );
        const data = await res.json();
        setSuggestions(
          data.map((d: any) => ({ label: d.display_name, lat: Number(d.lat), lng: Number(d.lon) }))
        );
        setOpen(true);
      } catch {
        // aborted or offline — leave suggestions as-is
      }
    }, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function select(s: Suggestion) {
    setPicked(s);
    setQuery(s.label);
    setOpen(false);
    setSuggestions([]);
  }

  function clear() {
    setPicked(null);
    setQuery("");
    setSuggestions([]);
  }

  return (
    <div className="relative">
      <input type="hidden" name="lat" value={picked ? picked.lat : ""} />
      <input type="hidden" name="lng" value={picked ? picked.lng : ""} />
      <input type="hidden" name={labelFieldName} value={query} />

      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (picked) setPicked(null);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="input pr-8"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate hover:text-ink"
            aria-label="Clear location"
          >
            ×
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1.5 w-full card !rounded-xl py-1.5 max-h-56 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => select(s)}
                className="w-full text-left px-3.5 py-2 text-sm hover:bg-mist truncate"
                title={s.label}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
