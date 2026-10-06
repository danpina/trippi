import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }) }));
vi.mock("./db", () => ({ db: {} }));

import { hashToken, newResetToken, safeNext } from "./auth";
import { isThreadUnread } from "./unread";

describe("safeNext", () => {
  it("allows same-site paths", () => {
    expect(safeNext("/listings/new")).toBe("/listings/new");
    expect(safeNext("/search?q=ski")).toBe("/search?q=ski");
  });

  it("falls back to / for anything that could redirect off-site", () => {
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
    expect(safeNext(null)).toBe("/");
    expect(safeNext(undefined)).toBe("/");
  });
});

describe("reset tokens", () => {
  it("stores only a hash of the token", () => {
    const { token, hash } = newResetToken();
    expect(token).toHaveLength(64);
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toContain(token);
  });
});

describe("isThreadUnread", () => {
  const t0 = new Date("2026-01-01T10:00:00Z");
  const t1 = new Date("2026-01-01T11:00:00Z");
  const base = { initiatorId: "a", initiatorReadAt: t0, ownerReadAt: t0 };

  it("is unread when the other person wrote after you last looked", () => {
    expect(isThreadUnread({ ...base, messages: [{ senderId: "b", createdAt: t1 }] }, "a")).toBe(true);
  });

  it("is read when you wrote last, or opened it after the last message", () => {
    expect(isThreadUnread({ ...base, messages: [{ senderId: "a", createdAt: t1 }] }, "a")).toBe(false);
    expect(isThreadUnread({ ...base, initiatorReadAt: t1, messages: [{ senderId: "b", createdAt: t1 }] }, "a")).toBe(false);
    expect(isThreadUnread({ ...base, messages: [] }, "a")).toBe(false);
  });
});
