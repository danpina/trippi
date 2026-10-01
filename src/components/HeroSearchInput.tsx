"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Suggestion = { label: string; lat: number; lng: number };

// Soft bias toward Europe (left,top,right,bottom) — results outside this box can still show.
const EUROPE_VIEWBOX = "-25,72,45,34";

// Lives in the dark hero, so it keeps its own styling rather than reusing LocationPicker
// (built for the light sidebar). Selecting a suggestion jumps straight to geocoded results;
// typing and hitting the Search button without picking one still does a plain keyword
// search via the "q" field, same as before.
export default function HeroSearchInput() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextFetch = useRef(false);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
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
        setSuggestions(data.map((d: any) => ({ label: d.display_name, lat: Number(d.lat), lng: Number(d.lon) })));
        setOpen(true);
      } catch {
        // aborted or offline — leave suggestions as-is, plain keyword search still works
      }
    }, 200);
  }, [query]);

  function selectSuggestion(s: Suggestion) {
    skipNextFetch.current = true;
    setQuery(s.label);
    setOpen(false);
    setSuggestions([]);

    const form = inputRef.current?.closest("form");
    const category = (form?.querySelector('select[name="category"]') as HTMLSelectElement | null)?.value || "";

    const params = new URLSearchParams();
    if (category) params.set("category", category);
    params.set("lat", String(s.lat));
    params.set("lng", String(s.lng));
    params.set("locationLabel", s.label);
    params.set("radius", "100");
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Where to? e.g. Chamonix"
        autoComplete="off"
        className="w-full bg-transparent px-4 py-3 text-white placeholder-white/50 outline-none"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 top-full mt-2 w-full sm:w-[28rem] card !rounded-xl py-1.5 max-h-56 overflow-y-auto text-left">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(s)}
                className="w-full text-left px-3.5 py-2 text-sm text-ink hover:bg-mist truncate"
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
