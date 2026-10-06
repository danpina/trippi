"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSessionCookie, clearSessionCookie, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { runModerationRules } from "@/lib/moderation";
import { recomputeUserRating } from "@/lib/ratings";
import { uploadListingPhoto } from "@/lib/storage";

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

  await createSessionCookie(user.id);
  redirect("/");
}

export async function loginAction(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  await createSessionCookie(user.id);
  redirect("/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}

function parseListingFormData(formData: FormData) {
  return {
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    location: String(formData.get("location") || "").trim(),
    addressDetails: String(formData.get("addressDetails") || "").trim() || null,
    lat: formData.get("lat") ? Number(formData.get("lat")) : null,
    lng: formData.get("lng") ? Number(formData.get("lng")) : null,
    dateStart: new Date(String(formData.get("dateStart"))),
    dateEnd: new Date(String(formData.get("dateEnd"))),
    price: formData.get("price") ? Number(formData.get("price")) : null,
    priceNegotiable: formData.get("priceNegotiable") === "on",
    capacity: Number(formData.get("capacity") || 1),
    categoryId: String(formData.get("categoryId") || ""),
    listingType: String(formData.get("listingType") || "opportunity"),
    genderPreference: String(formData.get("genderPreference") || "any"),
    minAge: formData.get("minAge") ? Number(formData.get("minAge")) : null,
    maxAge: formData.get("maxAge") ? Number(formData.get("maxAge")) : null,
    photoUrls: String(formData.get("photoUrls") || "")
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean)
      .slice(0, 8),
    photoFiles: formData.getAll("photoFiles").filter((f): f is File => f instanceof File && f.size > 0),
    removePhotoIds: formData.getAll("removePhotoIds").map(String),
    coverKey: String(formData.get("coverKey") || ""),
  };
}

// New uploads are created one by one (not createMany) so each row's id is known, which lets
// a "new-N" coverKey (N = index among this submission's uploaded files) resolve to a real
// ListingPhoto id afterward.
async function uploadAndCreatePhotos(listingId: string, files: File[], startSortOrder: number) {
  const idByIndex = new Map<number, string>();
  for (let i = 0; i < files.length; i++) {
    const url = await uploadListingPhoto(files[i], listingId);
    const photo = await db.listingPhoto.create({ data: { listingId, url, sortOrder: startSortOrder + i } });
    idByIndex.set(i, photo.id);
  }
  return idByIndex;
}

// Moves whichever photo the submitter picked as cover to sortOrder 0, shifting the rest after
// it in their existing relative order — the only reordering this form exposes.
async function applyCoverOrder(listingId: string, coverKey: string, newFileIdByIndex: Map<number, string>) {
  if (!coverKey) return;
  const coverPhotoId = coverKey.startsWith("new-")
    ? newFileIdByIndex.get(Number(coverKey.slice(4))) || null
    : coverKey;
  if (!coverPhotoId) return;

  const photos = await db.listingPhoto.findMany({ where: { listingId }, orderBy: { sortOrder: "asc" } });
  const cover = photos.find((p) => p.id === coverPhotoId);
  if (!cover) return;
  const ordered = [cover, ...photos.filter((p) => p.id !== coverPhotoId)];
  await Promise.all(ordered.map((p, i) => db.listingPhoto.update({ where: { id: p.id }, data: { sortOrder: i } })));
}

export async function createListingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be logged in to post a listing.");

  const f = parseListingFormData(formData);

  const category = await db.category.findUnique({ where: { id: f.categoryId } });
  if (!category) throw new Error("Invalid category.");

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
      lat: f.lat,
      lng: f.lng,
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
    },
  });

  let nextSortOrder = 0;
  if (f.photoUrls.length) {
    await db.listingPhoto.createMany({
      data: f.photoUrls.map((url, i) => ({ listingId: listing.id, url, sortOrder: i })),
    });
    nextSortOrder = f.photoUrls.length;
  }
  const newFileIdByIndex = await uploadAndCreatePhotos(listing.id, f.photoFiles, nextSortOrder);
  await applyCoverOrder(listing.id, f.coverKey, newFileIdByIndex);

  redirect(`/listings/${listing.id}`);
}

export async function updateListingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be logged in.");

  const listingId = String(formData.get("listingId") || "");
  const existing = await db.listing.findUniqueOrThrow({ where: { id: listingId } });
  if (existing.ownerId !== user.id && !user.isAdmin) throw new Error("Not your listing.");

  const f = parseListingFormData(formData);

  const category = await db.category.findUnique({ where: { id: f.categoryId } });
  if (!category) throw new Error("Invalid category.");

  // Content changed, so it's re-checked exactly like a new listing — a fix can clear a flag,
  // and an edit can just as easily introduce one.
  const moderation = runModerationRules({
    title: f.title,
    description: f.description,
    price: f.price,
    dateStart: f.dateStart,
    dateEnd: f.dateEnd,
    category: category.name,
  });

  await db.listing.update({
    where: { id: listingId },
    data: {
      listingType: f.listingType,
      categoryId: f.categoryId,
      title: f.title,
      description: f.description,
      location: f.location,
      addressDetails: f.addressDetails,
      lat: f.lat,
      lng: f.lng,
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
    },
  });

  if (f.removePhotoIds.length) {
    await db.listingPhoto.deleteMany({ where: { id: { in: f.removePhotoIds }, listingId } });
  }

  const maxOrder = await db.listingPhoto.aggregate({ where: { listingId }, _max: { sortOrder: true } });
  let nextSortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
  if (f.photoUrls.length) {
    await db.listingPhoto.createMany({
      data: f.photoUrls.map((url, i) => ({ listingId, url, sortOrder: nextSortOrder + i })),
    });
    nextSortOrder += f.photoUrls.length;
  }
  const newFileIdByIndex = await uploadAndCreatePhotos(listingId, f.photoFiles, nextSortOrder);
  await applyCoverOrder(listingId, f.coverKey, newFileIdByIndex);

  redirect(`/listings/${listingId}`);
}

export async function setListingStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be logged in.");

  const listingId = String(formData.get("listingId") || "");
  const status = String(formData.get("status") || "");
  if (status !== "active" && status !== "closed") throw new Error("Invalid status.");

  const existing = await db.listing.findUniqueOrThrow({ where: { id: listingId } });
  if (existing.ownerId !== user.id && !user.isAdmin) throw new Error("Not your listing.");

  await db.listing.update({ where: { id: listingId }, data: { status } });
  revalidatePath("/listings/mine");
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

export type SettingsState = { error?: string; success?: string } | undefined;

export async function updateProfileAction(prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in." };

  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Name can't be empty." };

  const ageRaw = formData.get("age");
  const age = ageRaw ? Number(ageRaw) : null;
  if (age != null && (age < 13 || age > 120)) return { error: "Enter a realistic age." };

  const gender = String(formData.get("gender") || "");

  await db.user.update({
    where: { id: user.id },
    data: { name, age, gender: gender || null },
  });

  revalidatePath("/settings");
  return { success: "Profile updated." };
}

export async function changePasswordAction(prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in." };

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return { error: "Current password is incorrect." };
  }
  if (newPassword.length < 6) return { error: "New password must be at least 6 characters." };
  if (newPassword !== confirmPassword) return { error: "New passwords don't match." };

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  return { success: "Password changed." };
}
