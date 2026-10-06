import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/settings", "/messages", "/listings/new", "/listings/mine"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
