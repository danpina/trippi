// Each top-level activity gets a small set of signature duotone + icon variants, so listing
// cards read as a rich, varied grid even before hosts add real photos — and the SAME listing
// always gets the same variant (picked from a hash of its id), so it doesn't flicker between
// renders while still varying listing-to-listing within a category. Colors stay inside the
// alpenglow family (warm ember/gold against cool glacier/ink) so the set feels like one
// system, not a rainbow.
export type CategoryStyle = { from: string; to: string; icon: string };

export const CATEGORY_STYLES: Record<string, CategoryStyle[]> = {
  "snow-and-ski": [
    { from: "#0EBFAE", to: "#0B3B57", icon: "ski" },
    { from: "#8FD9E8", to: "#124E6B", icon: "ski" },
    { from: "#1F3350", to: "#0EBFAE", icon: "ski" },
  ],
  "hiking-and-trekking": [
    { from: "#3E7D4F", to: "#F2B705", icon: "hike" },
    { from: "#2F5C3C", to: "#8FB85C", icon: "hike" },
    { from: "#F2B705", to: "#3E7D4F", icon: "hike" },
  ],
  "running-and-athletics": [
    { from: "#FF5A36", to: "#C2196B", icon: "run" },
    { from: "#FF8A5C", to: "#FF5A36", icon: "run" },
    { from: "#C2196B", to: "#2B1B3D", icon: "run" },
  ],
  golf: [
    { from: "#3E8E52", to: "#F2D33C", icon: "golf" },
    { from: "#2F6B40", to: "#9FD98C", icon: "golf" },
    { from: "#F2D33C", to: "#3E8E52", icon: "golf" },
  ],
  cycling: [
    { from: "#2B6CFF", to: "#FF5A36", icon: "bike" },
    { from: "#5B8CFF", to: "#1F3350", icon: "bike" },
    { from: "#FF5A36", to: "#2B6CFF", icon: "bike" },
  ],
  "water-sports": [
    { from: "#0B3B57", to: "#0EBFAE", icon: "wave" },
    { from: "#0EBFAE", to: "#124E6B", icon: "wave" },
    { from: "#1F3350", to: "#8FD9E8", icon: "wave" },
  ],
  "climbing-and-mountain": [
    { from: "#4A4238", to: "#F2B705", icon: "climb" },
    { from: "#6B5F4E", to: "#C7CFB9", icon: "climb" },
    { from: "#F2B705", to: "#4A4238", icon: "climb" },
  ],
  "wellness-and-retreat": [
    { from: "#E7A6A6", to: "#F5E6B8", icon: "leaf" },
    { from: "#F5E6B8", to: "#D98C8C", icon: "leaf" },
    { from: "#C98CA6", to: "#F5E6B8", icon: "leaf" },
  ],
  "city-and-culture": [
    { from: "#2B1B3D", to: "#FF5A36", icon: "city" },
    { from: "#4A2E5C", to: "#F2B705", icon: "city" },
    { from: "#1F3350", to: "#C2196B", icon: "city" },
  ],
  "road-trip-and-camping": [
    { from: "#B8441A", to: "#1F3350", icon: "van" },
    { from: "#C97A4A", to: "#5B8CFF", icon: "van" },
    { from: "#1F3350", to: "#B8441A", icon: "van" },
  ],
  other: [
    { from: "#7C877E", to: "#C7CFB9", icon: "compass" },
    { from: "#5B6B63", to: "#0E1A16", icon: "compass" },
  ],
};

export const DEFAULT_STYLE: CategoryStyle = { from: "#5B6B63", to: "#0E1A16", icon: "compass" };

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Representative color for a category — chips, map markers — where a single, stable color
// is needed rather than a per-listing variant.
export function styleFor(topSlug: string | undefined | null): CategoryStyle {
  const variants = topSlug ? CATEGORY_STYLES[topSlug] : undefined;
  return variants?.[0] || DEFAULT_STYLE;
}

// Per-listing variant, stable across renders for the same seed (use the listing id).
export function styleForSeeded(topSlug: string | undefined | null, seed: string): CategoryStyle {
  const variants = topSlug ? CATEGORY_STYLES[topSlug] : undefined;
  if (!variants || variants.length === 0) return DEFAULT_STYLE;
  return variants[hashString(seed) % variants.length];
}
