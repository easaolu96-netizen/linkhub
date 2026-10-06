import type { Tables } from "@/lib/supabase/database.types";
import type { Socials } from "@/lib/socials";
import type { Theme } from "@/lib/theme";

/** Profile fields rendered on the public page / live preview (theme already parsed). */
export type ProfileData = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  theme: Theme;
  socials: Socials;
};

/** A link row as the dashboard sees it, with its total click count. */
export type DashboardLink = Tables<"links"> & { clicks: number };

/** Minimal link shape the profile view needs. */
export type ProfileLink = Pick<Tables<"links">, "id" | "title" | "url">;
