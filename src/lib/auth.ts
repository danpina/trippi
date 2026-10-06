import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "./db";

const SESSION_COOKIE = "tripswap_session";
const DEV_SECRET = "dev-only-secret-change-me";

// Checked lazily, per call: a missing secret in production must fail loudly rather than
// silently signing sessions with a publicly known default (which would let anyone forge a
// login), but throwing at import time would break the build.
function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret === DEV_SECRET)) {
    throw new Error("SESSION_SECRET is not set (or is the dev default) in production.");
  }
  return secret || DEV_SECRET;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// `v` ties a session to the user's sessionVersion, which is bumped on every password change
// or reset — so changing your password signs out every other device.
export async function createSessionCookie(user: { id: string; sessionVersion: number }) {
  const token = jwt.sign({ sub: user.id, v: user.sessionVersion }, getSecret(), { expiresIn: "30d" });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getSecret()) as { sub: string; v?: number };
    const user = await db.user.findUnique({ where: { id: payload.sub } });
    if (!user || (payload.v ?? 0) !== user.sessionVersion) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("AUTH_REQUIRED");
  return user;
}

// Only same-site relative paths — anything else (absolute URLs, protocol-relative "//evil")
// would turn the post-login redirect into an open redirect.
export function safeNext(next: unknown): string {
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newResetToken() {
  const token = randomBytes(32).toString("hex");
  return { token, hash: hashToken(token) };
}

export const MIN_PASSWORD_LENGTH = 8;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
