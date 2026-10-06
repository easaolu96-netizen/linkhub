import type { Json } from "@/lib/supabase/database.types";
import { isSafeHref, normalizeUrl } from "@/lib/validation/link";

export const SOCIAL_KEYS = [
  "instagram",
  "tiktok",
  "x",
  "youtube",
  "linkedin",
  "github",
  "email",
  "website",
] as const;

export type SocialKey = (typeof SOCIAL_KEYS)[number];
export type Socials = Partial<Record<SocialKey, string>>;

type Platform = {
  label: string;
  placeholder: string;
  /** Hostnames accepted when the user pastes a full URL. */
  hosts?: string[];
  /** Build a profile URL from a bare handle. */
  fromHandle?: (handle: string) => string;
};

export const SOCIAL_PLATFORMS: Record<SocialKey, Platform> = {
  instagram: {
    label: "Instagram",
    placeholder: "@yourhandle",
    hosts: ["instagram.com"],
    fromHandle: (h) => `https://instagram.com/${h}`,
  },
  tiktok: {
    label: "TikTok",
    placeholder: "@yourhandle",
    hosts: ["tiktok.com"],
    fromHandle: (h) => `https://www.tiktok.com/@${h}`,
  },
  x: {
    label: "X (Twitter)",
    placeholder: "@yourhandle",
    hosts: ["x.com", "twitter.com"],
    fromHandle: (h) => `https://x.com/${h}`,
  },
  youtube: {
    label: "YouTube",
    placeholder: "@yourchannel",
    hosts: ["youtube.com", "youtu.be"],
    fromHandle: (h) => `https://www.youtube.com/@${h}`,
  },
  linkedin: {
    label: "LinkedIn",
    placeholder: "your-profile or full URL",
    hosts: ["linkedin.com"],
    fromHandle: (h) => `https://www.linkedin.com/in/${h}`,
  },
  github: {
    label: "GitHub",
    placeholder: "yourusername",
    hosts: ["github.com"],
    fromHandle: (h) => `https://github.com/${h}`,
  },
  email: { label: "Email", placeholder: "you@example.com" },
  website: { label: "Website", placeholder: "yourwebsite.com" },
};

const HANDLE = /^[A-Za-z0-9._-]{1,100}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hostMatches(hostname: string, hosts: string[]) {
  const host = hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
  return hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

/**
 * Turn what the user typed (handle, @handle, or URL) into a safe, canonical URL.
 * Returns "" for empty input and null for invalid input.
 */
export function normalizeSocial(key: SocialKey, raw: string): string | null {
  const value = raw.trim();
  if (!value) return "";

  if (key === "email") {
    const email = value.replace(/^mailto:/i, "");
    return EMAIL.test(email) && email.length <= 254 ? `mailto:${email}` : null;
  }

  if (key === "website") {
    const url = normalizeUrl(value);
    return url && /^https?:/.test(url) ? url : null;
  }

  const platform = SOCIAL_PLATFORMS[key];
  // Handles may contain dots (instagram "jane.doe"), so only treat the input as
  // a URL if it has a slash/scheme or mentions the platform's own domain.
  const lower = value.toLowerCase();
  const looksLikeUrl =
    !value.startsWith("@") &&
    (lower.includes("/") || (platform.hosts ?? []).some((host) => lower.includes(host)));
  if (looksLikeUrl) {
    const url = normalizeUrl(value);
    if (!url || !/^https?:\/\//.test(url)) return null;
    return hostMatches(new URL(url).hostname, platform.hosts ?? []) ? url.replace(/^http:/, "https:") : null;
  }

  const handle = value.replace(/^@/, "");
  return HANDLE.test(handle) && platform.fromHandle ? platform.fromHandle(handle) : null;
}

/** Show a stored URL back to the user in its short form, e.g. "@jane". */
export function socialDisplayValue(key: SocialKey, url: string | undefined) {
  if (!url) return "";
  if (key === "email") return url.replace(/^mailto:/, "");
  if (key === "website") return url.replace(/^https?:\/\//, "");
  try {
    const { pathname } = new URL(url);
    const segments = pathname.split("/").filter(Boolean);
    if (key === "linkedin" && segments[0] === "in" && segments.length === 2) return segments[1] ?? url;
    if (segments.length === 1) {
      const handle = segments[0]!.replace(/^@/, "");
      return key === "github" ? handle : `@${handle}`;
    }
  } catch {}
  return url;
}

/** Lenient parser for the stored jsonb column: keeps only known keys with safe URLs. */
export function parseSocials(value: Json | null | undefined): Socials {
  const result: Socials = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  for (const key of SOCIAL_KEYS) {
    const url = value[key];
    if (typeof url === "string" && url.length <= 2048 && isSafeHref(url)) result[key] = url;
  }
  return result;
}
