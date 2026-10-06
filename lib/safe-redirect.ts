/**
 * Only allow redirects to same-site relative paths ("/dashboard"), never to
 * another origin ("//evil.com", "https://evil.com", "/\\evil.com").
 */
export function safeRedirectPath(path: string | null | undefined, fallback = "/dashboard") {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return fallback;
  }
  return path;
}
