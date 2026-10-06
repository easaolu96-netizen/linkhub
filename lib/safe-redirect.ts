const BASE = "https://linkhub.invalid";

/**
 * Only allow redirects to same-site relative paths ("/dashboard").
 *
 * Browsers strip tabs/newlines and treat "\" like "/" when parsing URLs, so
 * "/\t/evil.com" or "/\\evil.com" would otherwise become "//evil.com" and
 * leave the site. We reject control characters and backslashes outright, then
 * parse the path the same way a browser would and check the origin is unchanged.
 */
export function safeRedirectPath(path: string | null | undefined, fallback = "/dashboard") {
  if (typeof path !== "string" || path.length === 0 || path.length > 2048) return fallback;
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (/[\u0000-\u001F\u007F\\]/.test(path)) return fallback;

  try {
    const url = new URL(path, BASE);
    if (url.origin !== BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
