"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchPlaces, type PlaceSuggestion } from "@/lib/placesClient";

// Lives in the dark hero, so it keeps its own styling rather than reusing LocationPicker
// (built for the light sidebar). Selecting a suggestion jumps straight to geocoded results;
// typing and hitting the Search button without picking one still does a plain keyword
// search via the "q" field, same as before.
export default function HeroSearchInput() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
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
  }, [query]);

  function selectSuggestion(s: PlaceSuggestion) {
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
        aria-label="Where to?"
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
