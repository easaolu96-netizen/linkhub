import type { CookieOptionsWithName } from "@supabase/ssr";
import { SITE_URL } from "@/lib/env";

/**
 * Auth-cookie settings shared by the browser, server and proxy clients.
 * - Secure on HTTPS deployments, so session cookies never travel over plain HTTP.
 * - SameSite=Lax blocks the cookie on cross-site POSTs (CSRF) but keeps OAuth redirects working.
 * (httpOnly can't be used: Supabase's browser client must read the session.)
 */
export const AUTH_COOKIE_OPTIONS: CookieOptionsWithName = {
  path: "/",
  sameSite: "lax",
  secure: SITE_URL.startsWith("https://"),
};
