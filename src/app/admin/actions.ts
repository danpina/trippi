"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH, getCurrentUser, hashPassword } from "@/lib/auth";
import { recomputeUserRating } from "@/lib/ratings";
import { deleteListingCascade, deleteUserCascade } from "@/lib/deletion";

export type AdminState = { error?: string; success?: string } | undefined;

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Admin only.");
  return user;
}

// ─────────────────────────── Users ───────────────────────────

export async function adminUpdateUserAction(prevState: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return { error: "Admin only." };

  const userId = text(formData, "userId");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "That user no longer exists." };

  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const ageRaw = text(formData, "age");
  const gender = text(formData, "gender");
  const planTier = text(formData, "planTier") || "free";
  const homeLocation = text(formData, "homeLocation");
  const isAdmin = formData.get("isAdmin") === "on";
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!name || name.length > 60) return { error: "Name is required (60 characters max)." };
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return { error: "Enter a valid email address." };
  const age = ageRaw ? Number(ageRaw) : null;
  if (age != null && (!Number.isInteger(age) || age < 13 || age > 120)) return { error: "Age must be a whole number from 13 to 120." };
  if (!["", "woman", "man"].includes(gender)) return { error: "Invalid gender option." };
  if (!["free", "pro"].includes(planTier)) return { error: "Invalid plan." };
  if (homeLocation.length > 200) return { error: "Home location is too long." };
  if (newPassword && newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `A new password needs at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (newPassword.length > 72) return { error: "That password is too long (72 characters max)." };

  if (email !== target.email) {
    const clash = await db.user.findUnique({ where: { email } });
    if (clash) return { error: "Another account already uses that email." };
  }
  if (target.isAdmin && !isAdmin && (await db.user.count({ where: { isAdmin: true } })) <= 1) {
    return { error: "This is the only admin — promote another admin first." };
  }

  await db.user.update({
    where: { id: userId },
    data: {
      name,
      email,
      age,
      gender: gender || null,
      planTier,
      homeLocation: homeLocation || null,
      isAdmin,
      ...(formData.get("unlock") === "on" ? { failedLogins: 0, lockedUntil: null } : {}),
      // Setting a password also signs the user out everywhere and clears any lockout.
      ...(newPassword
        ? { passwordHash: await hashPassword(newPassword), sessionVersion: { increment: 1 }, failedLogins: 0, lockedUntil: null }
        : {}),
    },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath(`/users/${userId}`);
  return { success: newPassword ? "Saved. The password was changed and the user was signed out." : "Saved." };
}

export async function adminDeleteUserAction(prevState: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) return { error: "Admin only." };

  const userId = text(formData, "userId");
  if (text(formData, "confirm") !== "DELETE") return { error: "Type DELETE to confirm." };
  if (userId === admin.id) return { error: "You can't delete your own account here — use Settings." };

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "That user no longer exists." };
  if (target.isAdmin && (await db.user.count({ where: { isAdmin: true } })) <= 1) {
    return { error: "This is the only admin." };
  }

  await deleteUserCascade(userId);
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

// ─────────────────────────── Ratings ───────────────────────────

export async function adminUpdateRatingAction(formData: FormData) {
  await requireAdmin();

  const ratingId = text(formData, "ratingId");
  const score = Number(formData.get("score"));
  const comment = text(formData, "comment").slice(0, 1000) || null;
  if (!Number.isInteger(score) || score < 1 || score > 5) throw new Error("Score must be a whole number from 1 to 5.");

  const rating = await db.rating.update({ where: { id: ratingId }, data: { score, comment } });
  await recomputeUserRating(rating.rateeId);
  revalidateRating(rating.raterId, rating.rateeId);
}

export async function adminDeleteRatingAction(formData: FormData) {
  await requireAdmin();

  const rating = await db.rating.delete({ where: { id: text(formData, "ratingId") } });
  await recomputeUserRating(rating.rateeId);
  revalidateRating(rating.raterId, rating.rateeId);
}

export async function adminRecomputeRatingAction(formData: FormData) {
  await requireAdmin();
  const userId = text(formData, "userId");
  await recomputeUserRating(userId);
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath(`/users/${userId}`);
}

function revalidateRating(raterId: string, rateeId: string) {
  revalidatePath(`/admin/users/${raterId}`);
  revalidatePath(`/admin/users/${rateeId}`);
  revalidatePath(`/users/${rateeId}`);
  revalidatePath("/messages");
}

// ─────────────────────────── Listings ───────────────────────────

export async function adminDeleteListingAction(formData: FormData) {
  await requireAdmin();

  const listingId = text(formData, "listingId");
  const exists = await db.listing.findUnique({ where: { id: listingId }, select: { id: true } });
  if (exists) await deleteListingCascade(listingId);

  revalidatePath("/admin/listings");
  revalidatePath("/admin");
  revalidatePath("/search");
  const back = text(formData, "redirectTo");
  if (back.startsWith("/admin")) redirect(back);
}
