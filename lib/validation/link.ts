import { z } from "zod";

export const LINK_TITLE_MAX = 100;
export const LINK_URL_MAX = 2048;
export const MAX_LINKS = 100;

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

/**
 * Normalize a user-entered URL:
 *  - "example.com"       → "https://example.com"
 *  - "//example.com"     → "https://example.com"
 *  - "mailto:a@b.com"    → kept
 *  - "javascript:…", "data:…", "file:…" → null (rejected)
 * Returns null when the result isn't a safe, well-formed http(s)/mailto URL.
 */
export function normalizeUrl(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;

  if (value.startsWith("//")) {
    value = `https:${value}`;
  } else if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value) && !/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(value)) {
    // No scheme ("example.com", "example.com:8080/x") → assume https.
    value = `https://${value}`;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;

  if (url.protocol === "mailto:") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(decodeURIComponent(url.pathname)) ? url.href : null;
  }

  // Require a real-looking hostname ("example.com", not "example" or "a b").
  if (!url.hostname.includes(".") || url.hostname.endsWith(".") || url.username || url.password) {
    return null;
  }

  // "https://example.com/" → "https://example.com" (looks nicer, same destination)
  const href = url.pathname === "/" && !url.search && !url.hash ? url.href.slice(0, -1) : url.href;
  return href.length <= LINK_URL_MAX ? href : null;
}

/** True only for URLs safe to put in an href (defense in depth when rendering). */
export function isSafeHref(url: string) {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

export const linkUrlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .max(LINK_URL_MAX, "URL is too long")
  .transform((value, ctx) => {
    const normalized = normalizeUrl(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Enter a valid web address (https://…) or mailto: link" });
      return z.NEVER;
    }
    return normalized;
  });

export const linkTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(LINK_TITLE_MAX, `At most ${LINK_TITLE_MAX} characters`);

export const linkInputSchema = z.object({
  title: linkTitleSchema,
  url: linkUrlSchema,
});

export const linkUpdateSchema = z.object({
  id: z.uuid(),
  title: linkTitleSchema.optional(),
  url: linkUrlSchema.optional(),
  is_visible: z.boolean().optional(),
});

export const reorderSchema = z.array(z.uuid()).max(MAX_LINKS);

export type LinkInput = z.input<typeof linkInputSchema>;
