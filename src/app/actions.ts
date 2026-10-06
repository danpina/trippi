"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  EMAIL_PATTERN,
  MIN_PASSWORD_LENGTH,
  clearSessionCookie,
  createSessionCookie,
  getCurrentUser,
  hashPassword,
  hashToken,
  newResetToken,
  safeNext,
  verifyPassword,
} from "@/lib/auth";
import { runModerationRules } from "@/lib/moderation";
import { recomputeUserRating } from "@/lib/ratings";
import { PhotoError, uploadListingPhoto } from "@/lib/storage";
import { readListingForm, validateListing } from "@/lib/listingForm";
import { geocode } from "@/lib/geocode";
import { sendEmail } from "@/lib/email";
import { notifyNewMessage } from "@/lib/notify";
import { SITE_URL } from "@/lib/site";
import { todayUtc } from "@/lib/dates";

// Expected, user-facing failures (bad password, validation) are returned as form state
// rather than thrown — Next.js redacts thrown Server Action errors in production down to a
// generic "server-side exception" page, which is right for real bugs but wrong for validation.
export type AuthState = { error?: string; message?: string } | undefined;
export type ListingState = { error?: string } | undefined;
export type ContactState = { error?: string } | undefined;

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const HOUR = 3600_000;
const DAY = 24 * HOUR;
const MAX_MESSAGE = 2000;

// ───────────────────────────── Auth ─────────────────────────────

export async function registerAction(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = text(formData, "name");
  const next = safeNext(formData.get("next"));

  if (!name || !email || !password) return { error: "Please fill in all fields." };
  if (name.length > 60) return { error: "That name is too long (60 characters max)." };
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return { error: "Enter a valid email address." };
  if (password.length < MIN_PASSWORD_LENGTH) return { error: `Use a password of at least ${MIN_PASSWORD_LENGTH} characters.` };
  if (password.length > 72) return { error: "That password is too long (72 characters max)." };
  if (formData.get("acceptTerms") !== "on") return { error: "Please accept the terms & disclaimer to create an account." };

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  // Admin rights are never granted at signup — an unverified email address can't be trusted
  // to prove identity. Promote an account explicitly (see README) instead.
  const user = await db.user.create({
    data: { email, name, passwordHash: await hashPassword(password), acceptedTermsAt: new Date() },
  });

  await createSessionCookie(user);
  redirect(next);
}

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
// Used to burn the same bcrypt time when the email doesn't exist, so response time doesn't
// reveal which emails have accounts.
const DUMMY_HASH = "$2a$10$7EqJtq98hPqEX7fNZaFWoOa5T7kT3L2bZ0m9yQy6cQy3bq9r7m1ZK";

export async function loginAction(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const user = await db.user.findUnique({ where: { email } });

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    return { error: "Too many failed attempts. Try again in a few minutes, or reset your password." };
  }

  const ok = user ? await verifyPassword(password, user.passwordHash) : (await verifyPassword(password, DUMMY_HASH), false);
  if (!user || !ok) {
    if (user) {
      const failed = user.failedLogins + 1;
      await db.user.update({
        where: { id: user.id },
        data:
          failed >= MAX_FAILED_LOGINS
            ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
            : { failedLogins: failed },
      });
    }
    return { error: "Invalid email or password." };
  }

  if (user.failedLogins || user.lockedUntil) {
    await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  }
  await createSessionCookie(user);
  redirect(next);
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}

const RESET_TTL = HOUR;

export async function requestPasswordResetAction(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = text(formData, "email").toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { error: "Enter a valid email address." };

  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    const recent = await db.passwordResetToken.findFirst({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60_000) } },
    });
    if (!recent) {
      const { token, hash } = newResetToken();
      await db.$transaction([
        db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        db.passwordResetToken.create({
          data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + RESET_TTL) },
        }),
      ]);
      await sendEmail(
        user.email,
        "Reset your TripSwap password",
        `Hi ${user.name},\n\nUse this link to choose a new password (valid for 1 hour):\n${SITE_URL}/reset-password?token=${token}\n\nIf you didn't ask for this, you can ignore this email.\n\n— TripSwap`
      );
    }
  }
  // Same answer whether or not the address has an account, so this can't be used to probe
  // which emails are registered.
  return { message: "If an account exists for that address, we've emailed a link to reset the password." };
}

export async function resetPasswordAction(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const token = text(formData, "token");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) return { error: `Use a password of at least ${MIN_PASSWORD_LENGTH} characters.` };
  if (password.length > 72) return { error: "That password is too long (72 characters max)." };
  if (password !== confirm) return { error: "The passwords don't match." };

  const record = token ? await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } }) : null;
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: {
        passwordHash: await hashPassword(password),
        sessionVersion: { increment: 1 },
        failedLogins: 0,
        lockedUntil: null,
      },
    }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  redirect("/login?reset=1");
}

// ───────────────────────────── Listings ─────────────────────────────

// Moves the chosen cover to the front, keeping everyone else's relative order.
function withCoverFirst<T extends { key: string }>(items: T[], coverKey: string): T[] {
  const idx = items.findIndex((it) => it.key === coverKey);
  if (idx <= 0) return items;
  return [items[idx], ...items.slice(0, idx), ...items.slice(idx + 1)];
}

async function uploadAll(files: File[]): Promise<{ urls: string[] } | { error: string }> {
  const folder = crypto.randomUUID();
  const urls: string[] = [];
  try {
    for (const f of files) urls.push(await uploadListingPhoto(f, folder));
  } catch (e) {
    console.error("photo upload failed", e);
    return { error: e instanceof PhotoError ? e.message : "Photo upload failed. Please try again." };
  }
  return { urls };
}

export async function createListingAction(prevState: ListingState, formData: FormData): Promise<ListingState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in to post a listing." };

  const raw = readListingForm(formData);
  if (!user.acceptedTermsAt && !raw.acceptTerms) return { error: "Please accept the terms & disclaimer to post." };

  const parsed = validateListing(raw, { existingPhotoCount: 0 });
  if ("error" in parsed) return parsed;
  const f = parsed.value;

  const category = await db.category.findUnique({ where: { id: f.categoryId } });
  if (!category) return { error: "Choose a valid activity." };

  if (!user.isAdmin) {
    const recent = await db.listing.count({ where: { ownerId: user.id, createdAt: { gt: new Date(Date.now() - DAY) } } });
    if (recent >= 10) return { error: "You've posted a lot of listings today — please try again tomorrow." };
  }

  const coords = f.lat == null ? await geocode(f.location) : { lat: f.lat, lng: f.lng as number };

  // Upload before creating anything: a failed upload then leaves no half-created listing,
  // and resubmitting can't produce a duplicate.
  const uploaded = await uploadAll(raw.photoFiles);
  if ("error" in uploaded) return uploaded;

  const items = withCoverFirst(
    [
      ...uploaded.urls.map((url, i) => ({ key: `new-${i}`, url })),
      ...f.photoUrls.map((url, i) => ({ key: `url-${i}`, url })),
    ],
    raw.coverKey
  );

  const moderation = runModerationRules({
    title: f.title,
    description: f.description,
    price: f.price,
    dateStart: f.dateStart,
    dateEnd: f.dateEnd,
    category: category.name,
  });

  const listing = await db.listing.create({
    data: {
      ownerId: user.id,
      listingType: f.listingType,
      categoryId: f.categoryId,
      title: f.title,
      description: f.description,
      location: f.location,
      addressDetails: f.addressDetails,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      dateStart: f.dateStart,
      dateEnd: f.dateEnd,
      price: f.price,
      priceNegotiable: f.priceNegotiable,
      capacity: f.capacity,
      genderPreference: f.genderPreference,
      minAge: f.minAge,
      maxAge: f.maxAge,
      moderationStatus: moderation.status,
      moderationNotes: moderation.notes.join(" | ") || null,
      photos: { create: items.map((it, i) => ({ url: it.url, sortOrder: i })) },
    },
  });

  if (!user.acceptedTermsAt) {
    await db.user.update({ where: { id: user.id }, data: { acceptedTermsAt: new Date() } });
  }

  redirect(`/listings/${listing.id}`);
}

export async function updateListingAction(prevState: ListingState, formData: FormData): Promise<ListingState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in." };

  const listingId = text(formData, "listingId");
  const existing = await db.listing.findUnique({
    where: { id: listingId },
    include: { photos: { orderBy: { sortOrder: "asc" } } },
  });
  if (!existing) return { error: "That listing no longer exists." };
  if (existing.ownerId !== user.id && !user.isAdmin) return { error: "That's not your listing." };

  const raw = readListingForm(formData);
  if (!user.acceptedTermsAt && !raw.acceptTerms) return { error: "Please accept the terms & disclaimer to continue." };

  const removeIds = new Set(raw.removePhotoIds);
  const kept = existing.photos.filter((p) => !removeIds.has(p.id));

  const parsed = validateListing(raw, { existingPhotoCount: kept.length });
  if ("error" in parsed) return parsed;
  const f = parsed.value;

  const category = await db.category.findUnique({ where: { id: f.categoryId } });
  if (!category) return { error: "Choose a valid activity." };

  const coords = f.lat == null ? await geocode(f.location) : { lat: f.lat, lng: f.lng as number };

  const uploaded = await uploadAll(raw.photoFiles);
  if ("error" in uploaded) return uploaded;

  type Item = { key: string; id?: string; url?: string };
  const items = withCoverFirst<Item>(
    [
      ...kept.map((p) => ({ key: p.id, id: p.id })),
      ...f.photoUrls.map((url, i) => ({ key: `url-${i}`, url })),
      ...uploaded.urls.map((url, i) => ({ key: `new-${i}`, url })),
    ],
    raw.coverKey
  );

  // Content changed, so it's re-checked exactly like a new listing — a fix can clear a flag,
  // and an edit can just as easily introduce one. A rejection is the exception: only an
  // admin can lift it, so editing can't be used to republish a rejected listing.
  const moderation = runModerationRules({
    title: f.title,
    description: f.description,
    price: f.price,
    dateStart: f.dateStart,
    dateEnd: f.dateEnd,
    category: category.name,
  });
  const stayRejected = existing.moderationStatus === "rejected" && !user.isAdmin;

  await db.$transaction([
    db.listingPhoto.deleteMany({ where: { id: { in: [...removeIds] }, listingId } }),
    db.listing.update({
      where: { id: listingId },
      data: {
        listingType: f.listingType,
        categoryId: f.categoryId,
        title: f.title,
        description: f.description,
        location: f.location,
        addressDetails: f.addressDetails,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        dateStart: f.dateStart,
        dateEnd: f.dateEnd,
        price: f.price,
        priceNegotiable: f.priceNegotiable,
        capacity: f.capacity,
        genderPreference: f.genderPreference,
        minAge: f.minAge,
        maxAge: f.maxAge,
        moderationStatus: stayRejected ? "rejected" : moderation.status,
        moderationNotes: stayRejected ? existing.moderationNotes : moderation.notes.join(" | ") || null,
      },
    }),
    ...items.map((it, i) =>
      it.id
        ? db.listingPhoto.update({ where: { id: it.id }, data: { sortOrder: i } })
        : db.listingPhoto.create({ data: { listingId, url: it.url as string, sortOrder: i } })
    ),
  ]);

  if (!user.acceptedTermsAt) {
    await db.user.update({ where: { id: user.id }, data: { acceptedTermsAt: new Date() } });
  }

  redirect(`/listings/${listingId}`);
}

export async function setListingStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be logged in.");

  const listingId = text(formData, "listingId");
  const status = text(formData, "status");
  if (status !== "active" && status !== "closed") throw new Error("Invalid status.");

  const existing = await db.listing.findUniqueOrThrow({ where: { id: listingId } });
  if (existing.ownerId !== user.id && !user.isAdmin) throw new Error("Not your listing.");

  await db.listing.update({ where: { id: listingId }, data: { status } });
  revalidatePath("/listings/mine");
}

// ───────────────────────────── Messaging ─────────────────────────────

export async function contactOwnerAction(prevState: ContactState, formData: FormData): Promise<ContactState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in to contact the host." };

  const listingId = text(formData, "listingId");
  const message = text(formData, "message");
  if (!message) return { error: "Write a message first." };
  if (message.length > MAX_MESSAGE) return { error: `That message is too long (${MAX_MESSAGE} characters max).` };

  const listing = await db.listing.findUnique({ where: { id: listingId }, include: { owner: true } });
  if (!listing) return { error: "That listing no longer exists." };
  if (listing.ownerId === user.id) return { error: "You can't message your own listing." };
  if (listing.moderationStatus !== "published" || listing.status !== "active" || listing.dateEnd < todayUtc()) {
    return { error: "This listing is no longer available." };
  }

  const since = new Date(Date.now() - HOUR);
  const [sentRecently, existingThread] = await Promise.all([
    db.message.count({ where: { senderId: user.id, createdAt: { gt: since } } }),
    db.thread.findUnique({ where: { listingId_initiatorId: { listingId, initiatorId: user.id } } }),
  ]);
  if (sentRecently >= 60) return { error: "You're sending messages very quickly — please wait a bit." };
  if (!existingThread) {
    const newThreads = await db.thread.count({ where: { initiatorId: user.id, createdAt: { gt: since } } });
    if (newThreads >= 10) return { error: "You've started a lot of conversations — please wait a bit before starting more." };
  }

  const thread =
    existingThread ??
    (await db.thread.create({
      data: { listingId, initiatorId: user.id, ownerId: listing.ownerId, initiatorReadAt: new Date() },
    }));

  await db.message.create({ data: { threadId: thread.id, senderId: user.id, body: message } });
  await notifyNewMessage({
    to: listing.owner.email,
    toName: listing.owner.name,
    fromName: user.name,
    listingTitle: listing.title,
    threadId: thread.id,
    preview: message,
  });

  redirect(`/messages/${thread.id}`);
}

export async function sendMessageAction(prevState: ContactState, formData: FormData): Promise<ContactState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in." };

  const threadId = text(formData, "threadId");
  const body = text(formData, "body");
  if (!body) return { error: "Write a message first." };
  if (body.length > MAX_MESSAGE) return { error: `That message is too long (${MAX_MESSAGE} characters max).` };

  const thread = await db.thread.findUnique({ where: { id: threadId }, include: { listing: true } });
  if (!thread || (thread.initiatorId !== user.id && thread.ownerId !== user.id)) {
    return { error: "That conversation isn't available." };
  }

  const sentRecently = await db.message.count({ where: { senderId: user.id, createdAt: { gt: new Date(Date.now() - HOUR) } } });
  if (sentRecently >= 60) return { error: "You're sending messages very quickly — please wait a bit." };

  const iAmInitiator = thread.initiatorId === user.id;
  const otherReadAt = iAmInitiator ? thread.ownerReadAt : thread.initiatorReadAt;

  // Only email when this starts a new unread run — not once per message in a burst.
  const unreadFromMe = await db.message.count({
    where: { threadId, senderId: user.id, ...(otherReadAt ? { createdAt: { gt: otherReadAt } } : {}) },
  });

  await db.$transaction([
    db.message.create({ data: { threadId, senderId: user.id, body } }),
    db.thread.update({
      where: { id: threadId },
      data: iAmInitiator ? { initiatorReadAt: new Date() } : { ownerReadAt: new Date() },
    }),
  ]);

  if (unreadFromMe === 0) {
    const other = await db.user.findUnique({ where: { id: iAmInitiator ? thread.ownerId : thread.initiatorId } });
    if (other) {
      await notifyNewMessage({
        to: other.email,
        toName: other.name,
        fromName: user.name,
        listingTitle: thread.listing.title,
        threadId,
        preview: body,
      });
    }
  }

  revalidatePath(`/messages/${threadId}`);
  return undefined;
}

export async function submitRatingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be logged in.");

  const threadId = text(formData, "threadId");
  const score = Number(formData.get("score"));
  const comment = text(formData, "comment").slice(0, 1000) || null;

  if (!Number.isInteger(score) || score < 1 || score > 5) throw new Error("Score must be a whole number from 1 to 5.");

  const thread = await db.thread.findUniqueOrThrow({ where: { id: threadId } });
  if (user.id !== thread.initiatorId && user.id !== thread.ownerId) throw new Error("Not your conversation.");
  const rateeId = thread.initiatorId === user.id ? thread.ownerId : thread.initiatorId;

  // The UI only offers rating once both sides have written; enforce it here too.
  const senders = new Set((await db.message.findMany({ where: { threadId }, select: { senderId: true } })).map((m) => m.senderId));
  if (!senders.has(thread.initiatorId) || !senders.has(thread.ownerId)) {
    throw new Error("You can rate once both of you have replied.");
  }

  await db.rating.upsert({
    where: { threadId_raterId: { threadId, raterId: user.id } },
    update: { score, comment },
    create: { threadId, raterId: user.id, rateeId, score, comment },
  });

  await recomputeUserRating(rateeId);
  revalidatePath(`/messages/${threadId}`);
}

// ───────────────────────────── Reports & moderation ─────────────────────────────

export type ReportState = { success?: boolean; error?: string } | undefined;

export async function submitReportAction(prevState: ReportState, formData: FormData): Promise<ReportState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in to report something." };

  const targetType = text(formData, "targetType");
  const targetId = text(formData, "targetId");
  const reasonCode = text(formData, "reasonCode");
  const details = text(formData, "details");

  if (!reasonCode) return { error: "Please select a reason." };
  if (details.length > 1000) return { error: "Details are too long (1,000 characters max)." };

  if (targetType === "listing") {
    const l = await db.listing.findUnique({ where: { id: targetId } });
    if (!l) return { error: "That listing no longer exists." };
    if (l.ownerId === user.id) return { error: "You can't report your own listing." };
  } else if (targetType === "user") {
    const u = await db.user.findUnique({ where: { id: targetId } });
    if (!u) return { error: "That user no longer exists." };
    if (u.id === user.id) return { error: "You can't report yourself." };
  } else {
    return { error: "Invalid report target." };
  }

  const duplicate = await db.report.findFirst({ where: { reporterId: user.id, targetType, targetId, status: "open" } });
  if (duplicate) return { success: true };

  const today = await db.report.count({ where: { reporterId: user.id, createdAt: { gt: new Date(Date.now() - DAY) } } });
  if (today >= 10) return { error: "You've sent several reports today — we'll review those first." };

  await db.report.create({
    data: { reporterId: user.id, targetType, targetId, reason: details ? `${reasonCode} — ${details}` : reasonCode },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function adminModerateAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Admin only.");

  const listingId = text(formData, "listingId");
  const decision = text(formData, "decision");
  if (decision !== "approve" && decision !== "reject") throw new Error("Invalid decision.");

  await db.listing.update({
    where: { id: listingId },
    data: { moderationStatus: decision === "approve" ? "published" : "rejected" },
  });

  revalidatePath("/admin");
}

export async function dismissReportAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Admin only.");

  await db.report.update({ where: { id: text(formData, "reportId") }, data: { status: "dismissed" } });
  revalidatePath("/admin");
}

export async function toggleSaveAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be logged in to save a listing.");

  const listingId = text(formData, "listingId");
  const path = safeNext(formData.get("path"));

  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.ownerId === user.id) return;

  const existing = await db.savedListing.findUnique({
    where: { userId_listingId: { userId: user.id, listingId } },
  });

  if (existing) {
    await db.savedListing.delete({ where: { id: existing.id } });
  } else {
    await db.savedListing.create({ data: { userId: user.id, listingId } });
  }

  revalidatePath(path);
}

// ───────────────────────────── Account ─────────────────────────────

export type SettingsState = { error?: string; success?: string } | undefined;

export async function updateProfileAction(prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in." };

  const name = text(formData, "name");
  if (!name) return { error: "Name can't be empty." };
  if (name.length > 60) return { error: "That name is too long (60 characters max)." };

  const ageRaw = text(formData, "age");
  const age = ageRaw ? Number(ageRaw) : null;
  if (age != null && (!Number.isInteger(age) || age < 13 || age > 120)) return { error: "Enter a realistic age." };

  const gender = text(formData, "gender");
  if (!["", "woman", "man"].includes(gender)) return { error: "Invalid gender option." };

  await db.user.update({ where: { id: user.id }, data: { name, age, gender: gender || null } });

  revalidatePath("/settings");
  return { success: "Profile updated." };
}

export async function changePasswordAction(prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in." };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return { error: "Current password is incorrect." };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) return { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  if (newPassword.length > 72) return { error: "That password is too long (72 characters max)." };
  if (newPassword !== confirmPassword) return { error: "New passwords don't match." };

  // Bumping sessionVersion signs out every other device; re-issue this one's cookie so the
  // device making the change stays logged in.
  const updated = await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword), sessionVersion: { increment: 1 } },
  });
  await createSessionCookie(updated);

  return { success: "Password changed. Other devices have been signed out." };
}

export async function deleteAccountAction(prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in." };

  if (text(formData, "confirm") !== "DELETE") return { error: "Type DELETE to confirm." };
  if (!(await verifyPassword(String(formData.get("password") ?? ""), user.passwordHash))) {
    return { error: "Password is incorrect." };
  }
  if (user.isAdmin && (await db.user.count({ where: { isAdmin: true } })) <= 1) {
    return { error: "You're the only admin — promote another admin before deleting this account." };
  }

  const uid = user.id;
  const listingIds = (await db.listing.findMany({ where: { ownerId: uid }, select: { id: true } })).map((l) => l.id);
  const threads = await db.thread.findMany({
    where: { OR: [{ initiatorId: uid }, { ownerId: uid }, { listingId: { in: listingIds } }] },
    select: { id: true, initiatorId: true, ownerId: true },
  });
  const threadIds = threads.map((t) => t.id);
  const counterparts = new Set(threads.flatMap((t) => [t.initiatorId, t.ownerId]).filter((id) => id !== uid));

  await db.$transaction([
    db.rating.deleteMany({ where: { threadId: { in: threadIds } } }),
    db.message.deleteMany({ where: { threadId: { in: threadIds } } }),
    db.thread.deleteMany({ where: { id: { in: threadIds } } }),
    db.savedListing.deleteMany({ where: { OR: [{ userId: uid }, { listingId: { in: listingIds } }] } }),
    db.listingPhoto.deleteMany({ where: { listingId: { in: listingIds } } }),
    db.report.deleteMany({
      where: {
        OR: [
          { reporterId: uid },
          { targetType: "user", targetId: uid },
          { targetType: "listing", targetId: { in: listingIds } },
        ],
      },
    }),
    db.listing.deleteMany({ where: { ownerId: uid } }),
    db.passwordResetToken.deleteMany({ where: { userId: uid } }),
    db.user.delete({ where: { id: uid } }),
  ]);

  for (const id of counterparts) await recomputeUserRating(id);

  await clearSessionCookie();
  redirect("/?deleted=1");
}
