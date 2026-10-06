import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";

// Rebuild at most once an hour.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
  ];

  // Every claimed profile page. (Sitemaps cap at 50,000 URLs.)
  const { data } = await createPublicClient()
    .from("profiles")
    .select("username, updated_at")
    .not("username", "is", null)
    .order("updated_at", { ascending: false })
    .limit(49_000);

  for (const profile of data ?? []) {
    if (!profile.username) continue;
    entries.push({
      url: `${SITE_URL}/${profile.username}`,
      lastModified: profile.updated_at,
      changeFrequency: "daily",
      priority: 0.7,
    });
  }

  return entries;
}
