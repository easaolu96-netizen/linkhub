import type { CookieOptionsWithName } from "@supabase/ssr";
import { SITE_URL } from "@/lib/env";

/**
 * Auth-cookie settings shared by the browser, server and proxy clients.
 * - Secure on HTTPS deployments, so session cookies never travel over plain HTTP.
 * - SameSite=Lax blocks the cookie on cross-site POSTs (CSRF) but keeps OAuth redirects working.
 * - On HTTPS the cookie name carries the `__Host-` prefix: browsers then only
 *   accept it from this exact host (Secure, Path=/, no Domain). A site on the
 *   parent domain (kashdigit.com) can't plant or overwrite our session cookie
 *   (cookie tossing / session fixation). Plain-HTTP local dev keeps the default name.
 * (httpOnly can't be used: Supabase's browser client must read the session.)
 */
const isHttps = SITE_URL.startsWith("https://");

export const AUTH_COOKIE_OPTIONS: CookieOptionsWithName = {
  ...(isHttps ? { name: "__Host-linkhub-auth" } : {}),
  path: "/",
  sameSite: "lax",
  secure: isHttps,
};
