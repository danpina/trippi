import { describe, expect, it } from "vitest";
import { tripMeta, todayUtc } from "./dates";
import { formatDate, formatDateRange, formatPrice } from "./format";

describe("tripMeta", () => {
  const now = new Date("2026-10-01T22:30:00Z");

  it("counts days ahead and trip length in UTC calendar days", () => {
    const m = tripMeta("2026-10-11T00:00:00Z", "2026-10-18T00:00:00Z", now);
    expect(m.daysAhead).toBe(10);
    expect(m.lengthDays).toBe(7);
    expect(m.aheadLabel).toBe("in 10 days");
    expect(m.lengthLabel).toBe("7 days");
  });

  it("handles today, past, and single-day trips", () => {
    expect(tripMeta("2026-10-01T00:00:00Z", "2026-10-01T00:00:00Z", now)).toMatchObject({
      aheadLabel: "today",
      lengthLabel: "1 day",
    });
    expect(tripMeta("2026-09-29T00:00:00Z", "2026-09-30T00:00:00Z", now).aheadLabel).toBe("2 days ago");
  });
});

describe("todayUtc", () => {
  it("returns UTC midnight", () => {
    expect(todayUtc(new Date("2026-10-01T22:30:00Z")).toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });
});

describe("formatting", () => {
  it("formats dates unambiguously regardless of server locale", () => {
    expect(formatDate("2026-10-18T00:00:00Z")).toBe("18 Oct 2026");
    expect(formatDateRange("2026-10-11T00:00:00Z", "2026-10-18T00:00:00Z")).toBe("11 Oct 2026 – 18 Oct 2026");
  });

  it("formats prices", () => {
    expect(formatPrice(null)).toBe("Free");
    expect(formatPrice(0)).toBe("Free");
    expect(formatPrice(340)).toContain("340");
    expect(formatPrice(340)).toContain("€");
    expect(formatPrice(12.5)).toContain("12.50");
  });
});
