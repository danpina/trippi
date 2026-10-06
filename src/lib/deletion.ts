import { db } from "./db";
import { recomputeUserRating } from "./ratings";

// There are no cascading deletes in the schema, so removals clear dependents explicitly.
// Photos in storage can't be deleted with the public key and are left orphaned.

export async function deleteListingCascade(listingId: string) {
  const threads = await db.thread.findMany({
    where: { listingId },
    select: { id: true, initiatorId: true, ownerId: true },
  });
  const threadIds = threads.map((t) => t.id);
  const participants = new Set(threads.flatMap((t) => [t.initiatorId, t.ownerId]));

  await db.$transaction([
    db.rating.deleteMany({ where: { threadId: { in: threadIds } } }),
    db.message.deleteMany({ where: { threadId: { in: threadIds } } }),
    db.thread.deleteMany({ where: { id: { in: threadIds } } }),
    db.savedListing.deleteMany({ where: { listingId } }),
    db.listingPhoto.deleteMany({ where: { listingId } }),
    db.report.deleteMany({ where: { targetType: "listing", targetId: listingId } }),
    db.listing.delete({ where: { id: listingId } }),
  ]);

  for (const id of participants) await recomputeUserRating(id);
}

export async function deleteUserCascade(uid: string) {
  const listingIds = (await db.listing.findMany({ where: { ownerId: uid }, select: { id: true } })).map((l) => l.id);
  const threads = await db.thread.findMany({
    where: { OR: [{ initiatorId: uid }, { ownerId: uid }, { listingId: { in: listingIds } }] },
    select: { id: true, initiatorId: true, ownerId: true },
  });
  const threadIds = threads.map((t) => t.id);
  const counterparts = new Set(threads.flatMap((t) => [t.initiatorId, t.ownerId]).filter((id) => id !== uid));

  await db.$transaction([
    db.rating.deleteMany({ where: { OR: [{ threadId: { in: threadIds } }, { raterId: uid }, { rateeId: uid }] } }),
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
}
