import "server-only";
import { cache } from "react";
import { safeAvatarUrl } from "@/lib/avatar";
import { createPublicClient } from "@/lib/supabase/public";
import { parseSocials } from "@/lib/socials";
import { parseTheme } from "@/lib/theme";
import type { ProfileData, ProfileLink } from "@/lib/types";

/**
 * Public profile + visible links for /[username]. Wrapped in React `cache` so
 * generateMetadata, generateViewport and the page share a single fetch.
 */
export const getPublicProfile = cache(
  async (username: string): Promise<{ profile: ProfileData; links: ProfileLink[] } | null> => {
    const supabase = createPublicClient();
    const { data: row, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, theme, socials")
      .eq("username", username)
      .maybeSingle();

    if (error) throw new Error(`Failed to load profile: ${error.message}`);
    if (!row?.username) return null;

    const { data: links, error: linksError } = await supabase
      .from("links")
      .select("id, title, url")
      .eq("user_id", row.id)
      .eq("is_visible", true)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (linksError) throw new Error(`Failed to load links: ${linksError.message}`);

    return {
      profile: {
        ...row,
        username: row.username,
        avatar_url: safeAvatarUrl(row.avatar_url, row.id),
        theme: parseTheme(row.theme),
        socials: parseSocials(row.socials),
      },
      links: links ?? [],
    };
  },
);
