import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { todayUtc } from "@/lib/dates";
import { SITE_URL } from "@/lib/site";

// Rendered per request (not at build time) so it always reflects the live listings.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listings = await db.listing.findMany({
    where: { moderationStatus: "published", status: "active", dateEnd: { gte: todayUtc() } },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/safety`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    ...listings.map((l) => ({
      url: `${SITE_URL}/listings/${l.id}`,
      lastModified: l.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
