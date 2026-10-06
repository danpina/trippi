export type PlaceSuggestion = { label: string; lat: number; lng: number };

// Place types worth suggesting — skips administrative oddities (joint municipalities, etc.)
// that otherwise crowd out the cities people actually mean.
const TYPES = "country,region,subregion,county,municipality,municipal_district,locality,neighbourhood,place,address,poi";

// MapTiler's geocoder, using the same public key as the map tiles. `proximity` is a soft
// bias toward central Europe, so a search for somewhere far away still works.
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (!key || query.trim().length < 2) return [];
  try {
    const res = await fetch(
      `https://api.maptiler.com/geocoding/${encodeURIComponent(query.trim())}.json?key=${key}&limit=5&autocomplete=true&language=en&proximity=10,48&types=${TYPES}`,
      { signal }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features || [])
      .filter((f: any) => Array.isArray(f.center) && f.place_name)
      .map((f: any) => ({ label: f.place_name as string, lat: f.center[1] as number, lng: f.center[0] as number }));
  } catch {
    return [];
  }
}
