import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { AUTH_COOKIE_OPTIONS } from "./cookie-options";
import type { Database } from "./database.types";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding"];
const AUTH_PAGES = ["/login", "/signup"];
/** Where users with two-factor sign-in enter their authenticator code. */
const MFA_PAGE = "/login/mfa";

/**
 * Refreshes the Supabase session cookie on every matched request and
 * enforces route protection. Called from /proxy.ts with the request headers
 * to forward (they carry the CSP nonce).
 */
export async function updateSession(request: NextRequest, requestHeaders: Headers) {
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // Forward the refreshed cookies to the page render too.
        requestHeaders.set("cookie", request.headers.get("cookie") ?? "");
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): it refreshes
  // the session if needed and verifies the JWT signature.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  // Signed in, but 2FA is on and the code hasn't been entered yet? (Read from
  // the session cookie: good enough for routing. The database enforces it.)
  let needsMfa = false;
  if (isSignedIn && data?.claims?.aal !== "aal2") {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    needsMfa = aal?.nextLevel === "aal2";
  }

  if (pathname === MFA_PAGE) {
    if (isSignedIn && needsMfa) return response;
    const url = request.nextUrl.clone();
    url.pathname = isSignedIn ? "/dashboard" : "/login";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  if (needsMfa && (isProtected || AUTH_PAGES.includes(pathname))) {
    const url = request.nextUrl.clone();
    const next = isProtected ? pathname + search : (request.nextUrl.searchParams.get("next") ?? "/dashboard");
    url.pathname = MFA_PAGE;
    url.search = `?next=${encodeURIComponent(next)}`;
    return redirectWithCookies(url, response);
  }

  if (!isSignedIn && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return redirectWithCookies(url, response);
  }

  if (isSignedIn && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

/** Keep any refreshed auth cookies when we redirect. */
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
