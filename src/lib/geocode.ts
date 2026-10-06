import { SITE_URL } from "./site";

// Server-side fallback for listings whose location was typed without picking a suggestion —
// without coordinates a listing never shows on the map or in distance sorting.
export async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (!key || !query.trim()) return null;
  try {
    const res = await fetch(
      `https://api.maptiler.com/geocoding/${encodeURIComponent(query.trim())}.json?key=${key}&limit=1&language=en&proximity=10,48`,
      { headers: { Origin: SITE_URL }, signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const c = data.features?.[0]?.center;
    return Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]) ? { lat: c[1], lng: c[0] } : null;
  } catch {
    return null;
  }
}
