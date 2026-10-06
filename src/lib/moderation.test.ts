import { describe, expect, it } from "vitest";
import { looksLikePhoneOrLink, runModerationRules } from "./moderation";

describe("looksLikePhoneOrLink", () => {
  it("does not flag dates, booking refs or flight numbers", () => {
    expect(looksLikePhoneOrLink("Available 15-12-2026 to 20-12-2026")).toBe(false);
    expect(looksLikePhoneOrLink("Check in 2026-12-15, out 2026-12-20")).toBe(false);
    expect(looksLikePhoneOrLink("Flight LH 1234 5678")).toBe(false);
    expect(looksLikePhoneOrLink("Booking ref 12345678 is transferable")).toBe(false);
    expect(looksLikePhoneOrLink("Two double beds, 3 nights from 20 December")).toBe(false);
  });

  it("flags phone numbers and links", () => {
    expect(looksLikePhoneOrLink("Call me on +49 170 1234567")).toBe(true);
    expect(looksLikePhoneOrLink("ring 0170 1234567 after six")).toBe(true);
    expect(looksLikePhoneOrLink("see https://example.com/deal")).toBe(true);
    expect(looksLikePhoneOrLink("go to www.example.com")).toBe(true);
  });
});

describe("runModerationRules", () => {
  const base = {
    title: "Spare week in a Chamonix chalet",
    description: "A comfortable chalet near the lifts, one room free after a cancellation. Dates are fixed.",
    price: 300,
    dateStart: new Date(Date.now() + 5 * 86400000),
    dateEnd: new Date(Date.now() + 10 * 86400000),
    category: "Snow & Ski",
  };

  it("publishes a clean listing", () => {
    expect(runModerationRules(base)).toEqual({ status: "published", notes: [] });
  });

  it("flags banned terms, past dates and absurd prices", () => {
    const r = runModerationRules({
      ...base,
      description: base.description + " Guaranteed returns!",
      dateEnd: new Date(Date.now() - 5 * 86400000),
      dateStart: new Date(Date.now() - 9 * 86400000),
      price: 99999,
    });
    expect(r.status).toBe("flagged");
    expect(r.notes.join(" ")).toMatch(/Banned term/);
    expect(r.notes.join(" ")).toMatch(/past/);
    expect(r.notes.join(" ")).toMatch(/implausibly high/);
  });

  it("does not flag a listing that ends today", () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    expect(runModerationRules({ ...base, dateStart: today, dateEnd: today }).status).toBe("published");
  });
});
