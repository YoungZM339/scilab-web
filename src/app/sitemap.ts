import type { MetadataRoute } from "next";

import { getSiteOrigin } from "@/server/config/site-url";
import { getSitemapEntries } from "@/server/services/public";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteOrigin();
  const detailEntries = await getSitemapEntries();
  const staticPaths = [
    "",
    "/people",
    "/research",
    "/projects",
    "/publications",
    "/news",
  ];

  return [
    ...staticPaths.map((path, index) => ({
      url: `${baseUrl}${path}`,
      changeFrequency: (index === 0 ? "weekly" : "monthly") as
        "weekly" | "monthly",
      priority: index === 0 ? 1 : 0.7,
    })),
    ...detailEntries.map((entry) => ({
      url: new URL(entry.path, `${baseUrl}/`).toString(),
      lastModified: entry.lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
