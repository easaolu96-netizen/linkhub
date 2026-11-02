import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-info";
import { contentSecurityPolicy, createNonce } from "@/lib/security/csp";
import { updateSession } from "@/lib/supabase/proxy";

/** Generated share images are cached, but each cache miss is expensive. */
const SHARE_IMAGE_LIMIT = { requests: 60, windowMs: 60_000 };

/** Pages where the Supabase session must be refreshed and checked. */
function needsSession(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/login/mfa" ||
    pathname === "/signup" ||
    ["/dashboard", "/onboarding"].some((p) => pathname === p || pathname.startsWith(`${p}/`))
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.endsWith("/opengraph-image")) {
    // Runs before the cache, so random usernames can't be used to force
    // endless fresh renders from one address.
    const ip = getClientIp(request.headers);
    if (!rateLimit(`og-image:${ip}`, SHARE_IMAGE_LIMIT.requests, SHARE_IMAGE_LIMIT.windowMs)) {
      return new NextResponse("Too many requests", {
        status: 429,
        headers: { "Retry-After": "60", "Cache-Control": "no-store" },
      });
    }
    return NextResponse.next();
  }

  // Strict CSP: a fresh nonce per page. Next.js reads it from the request's
  // CSP header and adds it to every script it renders.
  const nonce = createNonce();
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = needsSession(pathname)
    ? await updateSession(request, requestHeaders)
    : NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Every page (for the CSP nonce), but not API routes, static files or
      // link prefetches.
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
