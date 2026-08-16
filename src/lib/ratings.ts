import { db } from "./db";

// Denormalized avgRating/ratingCount on User are recomputed on every write
// so profile/listing displays never have to aggregate Rating rows on read.
export async function recomputeUserRating(userId: string) {
  const agg = await db.rating.aggregate({
    where: { rateeId: userId },
    _avg: { score: true },
    _count: { score: true },
  });
  await db.user.update({
    where: { id: userId },
    data: {
      avgRating: agg._avg.score ?? 0,
      ratingCount: agg._count.score,
    },
  });
}
