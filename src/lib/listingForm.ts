import { MAX_PHOTOS_PER_LISTING } from "./images";

export const LISTING_TYPES = ["opportunity", "plan"];
export const GENDER_PREFS = ["any", "men", "women"];

export type RawListingForm = {
  listingType: string;
  categoryId: string;
  title: string;
  description: string;
  location: string;
  addressDetails: string;
  lat: string;
  lng: string;
  dateStart: string;
  dateEnd: string;
  price: string;
  priceNegotiable: boolean;
  capacity: string;
  minAge: string;
  maxAge: string;
  genderPreference: string;
  photoUrls: string[];
  photoFiles: File[];
  removePhotoIds: string[];
  coverKey: string;
  acceptTerms: boolean;
};

export type ParsedListing = {
  listingType: string;
  categoryId: string;
  title: string;
  description: string;
  location: string;
  addressDetails: string | null;
  lat: number | null;
  lng: number | null;
  dateStart: Date;
  dateEnd: Date;
  price: number | null;
  priceNegotiable: boolean;
  capacity: number;
  minAge: number | null;
  maxAge: number | null;
  genderPreference: string;
  photoUrls: string[];
};

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export function readListingForm(fd: FormData): RawListingForm {
  return {
    listingType: text(fd, "listingType") || "opportunity",
    categoryId: text(fd, "categoryId"),
    title: text(fd, "title"),
    description: text(fd, "description"),
    location: text(fd, "location"),
    addressDetails: text(fd, "addressDetails"),
    lat: text(fd, "lat"),
    lng: text(fd, "lng"),
    dateStart: text(fd, "dateStart"),
    dateEnd: text(fd, "dateEnd"),
    price: text(fd, "price"),
    priceNegotiable: fd.get("priceNegotiable") === "on",
    capacity: text(fd, "capacity") || "1",
    minAge: text(fd, "minAge"),
    maxAge: text(fd, "maxAge"),
    genderPreference: text(fd, "genderPreference") || "any",
    photoUrls: text(fd, "photoUrls")
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean),
    photoFiles: fd.getAll("photoFiles").filter((f): f is File => f instanceof File && f.size > 0),
    removePhotoIds: fd.getAll("removePhotoIds").map(String),
    coverKey: text(fd, "coverKey"),
    acceptTerms: fd.get("acceptTerms") === "on",
  };
}

// Calendar day from an <input type="date"> value, as UTC midnight — rejecting impossible
// dates like 2026-02-31 that Date would silently roll over.
export function parseDay(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d;
}

function intInRange(raw: string, min: number, max: number): number | null | "invalid" {
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= min && n <= max ? n : "invalid";
}

// Returns either a user-facing error or the cleaned values. `existingPhotoCount` is how many
// photos the listing already keeps (edit only), for the per-listing cap.
export function validateListing(
  raw: RawListingForm,
  opts: { existingPhotoCount: number; now?: Date }
): { error: string } | { value: ParsedListing } {
  const now = opts.now ?? new Date();

  if (!LISTING_TYPES.includes(raw.listingType)) return { error: "Choose a listing type." };
  if (!raw.categoryId) return { error: "Choose an activity." };
  if (raw.title.length < 8) return { error: "The title needs at least 8 characters." };
  if (raw.title.length > 120) return { error: "The title is too long (120 characters max)." };
  if (raw.description.length < 30) return { error: "The description needs at least 30 characters." };
  if (raw.description.length > 4000) return { error: "The description is too long (4,000 characters max)." };
  if (raw.location.length < 2) return { error: "Enter a location." };
  if (raw.location.length > 200) return { error: "The location is too long." };
  if (raw.addressDetails.length > 200) return { error: "Address details are too long (200 characters max)." };

  const dateStart = parseDay(raw.dateStart);
  const dateEnd = parseDay(raw.dateEnd);
  if (!dateStart) return { error: "Enter a valid start date." };
  if (!dateEnd) return { error: "Enter a valid end date." };
  if (dateEnd < dateStart) return { error: "The end date can't be before the start date." };
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (dateEnd.getTime() < todayUtc) return { error: "The dates are already in the past." };

  let price: number | null = null;
  if (raw.price !== "") {
    price = Number(raw.price);
    if (!Number.isFinite(price) || price < 0 || price > 50000) return { error: "Price must be between 0 and 50,000." };
  }

  const capacity = intInRange(raw.capacity, 1, 100);
  if (capacity === "invalid" || capacity === null) return { error: "Capacity must be a whole number from 1 to 100." };

  const minAge = intInRange(raw.minAge, 13, 120);
  const maxAge = intInRange(raw.maxAge, 13, 120);
  if (minAge === "invalid" || maxAge === "invalid") return { error: "Ages must be whole numbers from 13 to 120." };
  if (minAge != null && maxAge != null && minAge > maxAge) return { error: "The minimum age can't exceed the maximum age." };

  if (!GENDER_PREFS.includes(raw.genderPreference)) return { error: "Invalid gender preference." };

  const lat = raw.lat === "" ? NaN : Number(raw.lat);
  const lng = raw.lng === "" ? NaN : Number(raw.lng);
  const coordsOk = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  for (const u of raw.photoUrls) {
    let ok = false;
    try {
      const url = new URL(u);
      ok = (url.protocol === "http:" || url.protocol === "https:") && u.length <= 500;
    } catch {}
    if (!ok) return { error: `"${u.slice(0, 60)}" is not a valid image URL.` };
  }
  if (opts.existingPhotoCount + raw.photoUrls.length + raw.photoFiles.length > MAX_PHOTOS_PER_LISTING) {
    return { error: `A listing can have at most ${MAX_PHOTOS_PER_LISTING} photos.` };
  }

  return {
    value: {
      listingType: raw.listingType,
      categoryId: raw.categoryId,
      title: raw.title,
      description: raw.description,
      location: raw.location,
      addressDetails: raw.addressDetails || null,
      lat: coordsOk ? lat : null,
      lng: coordsOk ? lng : null,
      dateStart,
      dateEnd,
      price,
      priceNegotiable: raw.priceNegotiable,
      capacity,
      minAge: minAge ?? null,
      maxAge: maxAge ?? null,
      genderPreference: raw.genderPreference,
      photoUrls: raw.photoUrls,
    },
  };
}
