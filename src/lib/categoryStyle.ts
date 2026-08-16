// Each top-level activity gets a signature duotone + icon, so listing cards read as a rich,
// varied grid even before hosts add real photos. Colors stay inside the alpenglow family
// (warm ember/gold against cool glacier/ink) so the set feels like one system, not a rainbow.
export type CategoryStyle = { from: string; to: string; icon: string };

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  "snow-and-ski": { from: "#0EBFAE", to: "#0B3B57", icon: "ski" },
  "hiking-and-trekking": { from: "#3E7D4F", to: "#F2B705", icon: "hike" },
  "running-and-athletics": { from: "#FF5A36", to: "#C2196B", icon: "run" },
  golf: { from: "#3E8E52", to: "#F2D33C", icon: "golf" },
  cycling: { from: "#2B6CFF", to: "#FF5A36", icon: "bike" },
  "water-sports": { from: "#0B3B57", to: "#0EBFAE", icon: "wave" },
  "climbing-and-mountain": { from: "#4A4238", to: "#F2B705", icon: "climb" },
  "wellness-and-retreat": { from: "#E7A6A6", to: "#F5E6B8", icon: "leaf" },
  "city-and-culture": { from: "#2B1B3D", to: "#FF5A36", icon: "city" },
  "road-trip-and-camping": { from: "#B8441A", to: "#1F3350", icon: "van" },
  other: { from: "#7C877E", to: "#C7CFB9", icon: "compass" },
};

export const DEFAULT_STYLE: CategoryStyle = { from: "#5B6B63", to: "#0E1A16", icon: "compass" };

export function styleFor(topSlug: string | undefined | null): CategoryStyle {
  return (topSlug && CATEGORY_STYLES[topSlug]) || DEFAULT_STYLE;
}
