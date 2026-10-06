import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GDPR-style data export: everything tied to the logged-in user, as a JSON download.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const [listings, threads, ratingsGiven, ratingsReceived, saved, reports] = await Promise.all([
    db.listing.findMany({ where: { ownerId: user.id }, include: { photos: true } }),
    db.thread.findMany({
      where: { OR: [{ initiatorId: user.id }, { ownerId: user.id }] },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    }),
    db.rating.findMany({ where: { raterId: user.id } }),
    db.rating.findMany({ where: { rateeId: user.id } }),
    db.savedListing.findMany({ where: { userId: user.id } }),
    db.report.findMany({ where: { reporterId: user.id } }),
  ]);

  const { passwordHash: _hash, failedLogins: _f, lockedUntil: _l, sessionVersion: _s, ...profile } = user;

  const body = JSON.stringify(
    { exportedAt: new Date().toISOString(), profile, listings, threads, ratingsGiven, ratingsReceived, saved, reports },
    null,
    2
  );

  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="tripswap-my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
