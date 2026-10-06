import { SUPABASE_URL } from "@/lib/env";

const STORAGE_HOST = new URL(SUPABASE_URL).host;
const OWN_UPLOAD = /^[0-9]{10,16}\.(jpg|jpeg|png|webp)$/;

/**
 * Avatars may only be (a) the owner's own upload in this project's public
 * "avatars" bucket, or (b) a Google profile photo. Mirrors the
 * profiles_avatar_url_allowed database constraint; checked again here before
 * rendering or fetching (defence in depth against SSRF / tracking pixels).
 */
export function safeAvatarUrl(url: string | null | undefined, ownerId: string): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) return null;

  if (parsed.host === STORAGE_HOST) {
    const prefix = `/storage/v1/object/public/avatars/${ownerId}/`;
    if (!parsed.pathname.startsWith(prefix) || parsed.search || parsed.hash) return null;
    return OWN_UPLOAD.test(parsed.pathname.slice(prefix.length)) ? parsed.href : null;
  }
  if (parsed.host === "lh3.googleusercontent.com") return parsed.href;
  return null;
}
