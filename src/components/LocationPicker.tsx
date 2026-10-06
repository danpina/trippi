"use client";

import { useEffect, useRef, useState } from "react";
import { searchPlaces, type PlaceSuggestion } from "@/lib/placesClient";

// Typing triggers suggestions from MapTiler's geocoder (key shared with the map tiles),
// biased toward Europe. The visible text is always submitted under `labelFieldName`; the
// coordinates only when a suggestion was actually picked.
export default function LocationPicker({
  defaultLabel,
  defaultLat,
  defaultLng,
  labelFieldName = "locationLabel",
  placeholder = "City or address, e.g. Chamonix, France",
  required = false,
}: {
  defaultLabel?: string;
  defaultLat?: string;
  defaultLng?: string;
  labelFieldName?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const [query, setQuery] = useState(defaultLabel || "");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<PlaceSuggestion | null>(
    defaultLabel && defaultLat && defaultLng
      ? { label: defaultLabel, lat: Number(defaultLat), lng: Number(defaultLng) }
      : null
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (picked && query === picked.label) return; // just selected, don't re-search
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const results = await searchPlaces(query, controller.signal);
      if (!controller.signal.aborted) {
        setSuggestions(results);
        setOpen(results.length > 0);
      }
    }, 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function select(s: PlaceSuggestion) {
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
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          required={required}
          className="input pr-8"
          autoComplete="off"
          aria-label="Location"
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
                onMouseDown={(e) => e.preventDefault()}
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
