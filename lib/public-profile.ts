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
    // One round trip: the profile with its visible links embedded (PostgREST
    // follows the links.user_id foreign key; RLS still applies to both).
    const { data: row, error } = await createPublicClient()
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, theme, socials, links(id, title, url)")
      .eq("username", username)
      .eq("links.is_visible", true)
      .order("position", { referencedTable: "links", ascending: true })
      .order("created_at", { referencedTable: "links", ascending: false })
      .maybeSingle();

    if (error) throw new Error(`Failed to load profile: ${error.message}`);
    if (!row?.username) return null;
    const { links, ...profile } = row;

    return {
      profile: {
        ...profile,
        username: row.username,
        avatar_url: safeAvatarUrl(row.avatar_url, row.id),
        theme: parseTheme(row.theme),
        socials: parseSocials(row.socials),
      },
      links: links ?? [],
    };
  },
);
