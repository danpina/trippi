import { describe, expect, it } from "vitest";
import { parseDay, validateListing, type RawListingForm } from "./listingForm";
import { sniffImageType } from "./images";

const raw = (over: Partial<RawListingForm> = {}): RawListingForm => ({
  listingType: "opportunity",
  categoryId: "cat1",
  title: "Spare week in a Chamonix chalet",
  description: "A comfortable chalet near the lifts, one room free after a cancellation.",
  location: "Chamonix, France",
  addressDetails: "",
  lat: "",
  lng: "",
  dateStart: "2030-01-10",
  dateEnd: "2030-01-17",
  price: "300",
  priceNegotiable: false,
  capacity: "2",
  minAge: "",
  maxAge: "",
  genderPreference: "any",
  photoUrls: [],
  photoFiles: [],
  removePhotoIds: [],
  coverKey: "",
  acceptTerms: true,
  ...over,
});

const err = (over: Partial<RawListingForm>) => {
  const r = validateListing(raw(over), { existingPhotoCount: 0, now: new Date("2029-12-01T00:00:00Z") });
  return "error" in r ? r.error : null;
};

describe("parseDay", () => {
  it("accepts real dates and rejects impossible ones", () => {
    expect(parseDay("2026-12-31")?.toISOString()).toBe("2026-12-31T00:00:00.000Z");
    expect(parseDay("2026-02-31")).toBeNull();
    expect(parseDay("2026-99-99")).toBeNull();
    expect(parseDay("garbage")).toBeNull();
    expect(parseDay("")).toBeNull();
  });
});

describe("validateListing", () => {
  it("accepts a valid listing", () => {
    expect(err({})).toBeNull();
  });

  it("rejects bad numbers instead of letting them reach the database", () => {
    expect(err({ price: "abc" })).toMatch(/Price/);
    expect(err({ price: "-5" })).toMatch(/Price/);
    expect(err({ capacity: "0" })).toMatch(/Capacity/);
    expect(err({ capacity: "1.5" })).toMatch(/Capacity/);
    expect(err({ minAge: "30", maxAge: "20" })).toMatch(/minimum age/);
  });

  it("rejects bad dates", () => {
    expect(err({ dateStart: "nope" })).toMatch(/start date/);
    expect(err({ dateEnd: "2029-12-31" })).toMatch(/before the start/);
    expect(err({ dateStart: "2029-01-01", dateEnd: "2029-01-05" })).toMatch(/past/);
  });

  it("enforces text lengths and photo limits", () => {
    expect(err({ title: "short" })).toMatch(/title/);
    expect(err({ description: "too short" })).toMatch(/description/);
    expect(err({ location: "" })).toMatch(/location/i);
    expect(err({ photoUrls: ["not a url"] })).toMatch(/valid image URL/);
    expect(err({ photoUrls: ["javascript:alert(1)"] })).toMatch(/valid image URL/);
    expect(err({ photoUrls: Array.from({ length: 11 }, (_, i) => `https://e.com/${i}.jpg`) })).toMatch(/at most/);
  });

  it("drops invalid coordinates rather than storing them", () => {
    const r = validateListing(raw({ lat: "999", lng: "10" }), { existingPhotoCount: 0, now: new Date("2029-12-01") });
    expect("value" in r && r.value.lat).toBeNull();
  });
});

describe("sniffImageType", () => {
  const pad = (bytes: number[]) => Uint8Array.from([...bytes, ...new Array(16).fill(0)]);

  it("recognises real image signatures", () => {
    expect(sniffImageType(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(pad([0x89, 0x50, 0x4e, 0x47]))).toBe("image/png");
    expect(sniffImageType(pad([0x47, 0x49, 0x46, 0x38]))).toBe("image/gif");
    expect(sniffImageType(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0, 0]))).toBe("image/webp");
  });

  it("rejects everything else", () => {
    expect(sniffImageType(new Uint8Array(64))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
    expect(sniffImageType(new Uint8Array(4))).toBeNull();
  });
});
