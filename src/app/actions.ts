"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSessionCookie, clearSessionCookie, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { runModerationRules } from "@/lib/moderation";
import { recomputeUserRating } from "@/lib/ratings";

// Expected, user-facing failures (bad password, duplicate email) are returned as form state
// rather than thrown — Next.js redacts thrown Server Action errors in production down to a
// generic "server-side exception" page, which is right for real bugs but wrong for validation.
export type AuthState = { error?: string } | undefined;

export async function registerAction(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "").trim();

  if (!email || !password || !name) return { error: "Please fill in all fields." };

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  const user = await db.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      isAdmin: email === (process.env.ADMIN_EMAIL || "").toLowerCase(),
    },
  });

  createSessionCookie(user.id);
  redirect("/");
}

export async function loginAction(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  createSessionCookie(user.id);
  redirect("/");
}

export async function logoutAction() {
  clearSessionCookie();
  redirect("/");
}

export async function createListingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be logged in to post a listing.");

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const lat = formData.get("lat") ? Number(formData.get("lat")) : null;
  const lng = formData.get("lng") ? Number(formData.get("lng")) : null;
  const dateStart = new Date(String(formData.get("dateStart")));
  const dateEnd = new Date(String(formData.get("dateEnd")));
  const priceRaw = formData.get("price");
  const price = priceRaw ? Number(priceRaw) : null;
  const priceNegotiable = formData.get("priceNegotiable") === "on";
  const capacity = Number(formData.get("capacity") || 1);
  const categoryId = String(formData.get("categoryId") || "");
  const listingType = String(formData.get("listingType") || "opportunity");
  const genderPreference = String(formData.get("genderPreference") || "any");
  const minAge = formData.get("minAge") ? Number(formData.get("minAge")) : null;
  const maxAge = formData.get("maxAge") ? Number(formData.get("maxAge")) : null;

  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error("Invalid category.");

  const moderation = runModerationRules({
    title,
    description,
    price,
    dateStart,
    dateEnd,
    category: category.name,
  });

  const listing = await db.listing.create({
    data: {
      ownerId: user.id,
      listingType,
      categoryId,
      title,
      description,
      location,
      lat,
      lng,
      dateStart,
      dateEnd,
      price,
      priceNegotiable,
      capacity,
      genderPreference,
      minAge,
      maxAge,
      moderationStatus: moderation.status,
      moderationNotes: moderation.notes.join(" | ") || null,
    },
  });

  const photoUrls = String(formData.get("photoUrls") || "")
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, 8);

  if (photoUrls.length) {
    await db.listingPhoto.createMany({
      data: photoUrls.map((url, i) => ({ listingId: listing.id, url, sortOrder: i })),
    });
  }

  redirect(`/listings/${listing.id}`);
}

export async function contactOwnerAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be logged in to contact the host.");

  const listingId = String(formData.get("listingId") || "");
  const message = String(formData.get("message") || "").trim();

  const listing = await db.listing.findUniqueOrThrow({ where: { id: listingId } });
  if (listing.ownerId === user.id) throw new Error("You can't message your own listing.");

  let thread = await db.thread.findUnique({
    where: { listingId_initiatorId: { listingId, initiatorId: user.id } },
  });

  if (!thread) {
    thread = await db.thread.create({
      data: { listingId, initiatorId: user.id, ownerId: listing.ownerId },
    });
  }

  if (message) {
    await db.message.create({
      data: { threadId: thread.id, senderId: user.id, body: message },
    });
  }

  redirect(`/messages/${thread.id}`);
}

export async function sendMessageAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be logged in.");

  const threadId = String(formData.get("threadId") || "");
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  const thread = await db.thread.findUniqueOrThrow({ where: { id: threadId } });
  if (thread.initiatorId !== user.id && thread.ownerId !== user.id) {
    throw new Error("Not your conversation.");
  }

  await db.message.create({ data: { threadId, senderId: user.id, body } });
  revalidatePath(`/messages/${threadId}`);
}

export async function submitRatingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be logged in.");

  const threadId = String(formData.get("threadId") || "");
  const score = Number(formData.get("score") || 0);
  const comment = String(formData.get("comment") || "").trim() || null;

  if (score < 1 || score > 5) throw new Error("Score must be between 1 and 5.");

  const thread = await db.thread.findUniqueOrThrow({ where: { id: threadId } });
  const rateeId = thread.initiatorId === user.id ? thread.ownerId : thread.initiatorId;
  if (user.id !== thread.initiatorId && user.id !== thread.ownerId) {
    throw new Error("Not your conversation.");
  }

  await db.rating.upsert({
    where: { threadId_raterId: { threadId, raterId: user.id } },
    update: { score, comment },
    create: { threadId, raterId: user.id, rateeId, score, comment },
  });

  await recomputeUserRating(rateeId);
  revalidatePath(`/messages/${threadId}`);
}

export type ReportState = { success?: boolean; error?: string } | undefined;

const REPORT_TARGET_TYPES = new Set(["listing", "user"]);

export async function submitReportAction(prevState: ReportState, formData: FormData): Promise<ReportState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in to report something." };

  const targetType = String(formData.get("targetType") || "");
  const targetId = String(formData.get("targetId") || "");
  const reasonCode = String(formData.get("reasonCode") || "");
  const details = String(formData.get("details") || "").trim();

  if (!REPORT_TARGET_TYPES.has(targetType) || !targetId) return { error: "Invalid report target." };
  if (!reasonCode) return { error: "Please select a reason." };

  await db.report.create({
    data: {
      reporterId: user.id,
      targetType,
      targetId,
      reason: details ? `${reasonCode} — ${details}` : reasonCode,
    },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function adminModerateAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Admin only.");

  const listingId = String(formData.get("listingId") || "");
  const decision = String(formData.get("decision") || "");

  await db.listing.update({
    where: { id: listingId },
    data: { moderationStatus: decision === "approve" ? "published" : "rejected" },
  });

  revalidatePath("/admin");
}

export async function dismissReportAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Admin only.");

  const reportId = String(formData.get("reportId") || "");
  await db.report.update({ where: { id: reportId }, data: { status: "dismissed" } });

  revalidatePath("/admin");
}

export async function toggleSaveAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be logged in to save a listing.");

  const listingId = String(formData.get("listingId") || "");
  const path = String(formData.get("path") || "/");

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
