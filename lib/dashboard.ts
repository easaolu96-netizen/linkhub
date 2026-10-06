import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { safeAvatarUrl } from "@/lib/avatar";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { parseSocials } from "@/lib/socials";
import { parseTheme } from "@/lib/theme";
import type { DashboardLink, ProfileData } from "@/lib/types";

/** Everything the dashboard needs on first load. */
export async function getDashboardData(): Promise<{
  profile: ProfileData;
  links: DashboardLink[];
}> {
  const user = await requireUser();
  const row = await getCurrentProfile();
  if (!row?.username) redirect("/onboarding");

  const supabase = await createClient();
  const [linksResult, countsResult] = await Promise.all([
    supabase
      .from("links")
      .select("*")
      .eq("user_id", user.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase.rpc("get_link_click_counts"),
  ]);

  if (linksResult.error) throw new Error(`Failed to load links: ${linksResult.error.message}`);

  const clicksById = new Map((countsResult.data ?? []).map((c) => [c.link_id, Number(c.clicks)]));

  return {
    profile: {
      id: row.id,
      username: row.username,
      display_name: row.display_name,
      bio: row.bio,
      avatar_url: safeAvatarUrl(row.avatar_url, row.id),
      theme: parseTheme(row.theme),
      socials: parseSocials(row.socials),
    },
    links: linksResult.data.map((link) => ({ ...link, clicks: clicksById.get(link.id) ?? 0 })),
  };
}
