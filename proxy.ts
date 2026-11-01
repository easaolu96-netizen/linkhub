import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-info";
import { updateSession } from "@/lib/supabase/proxy";

/** Generated share images are cached, but each cache miss is expensive. */
const SHARE_IMAGE_LIMIT = { requests: 60, windowMs: 60_000 };

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.endsWith("/opengraph-image")) {
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

  return updateSession(request);
}

export const config = {
  // Only run where auth matters, plus the share-image route (rate limit).
  // Public profile pages, the landing page and static assets skip the proxy
  // entirely so they stay fast.
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/login", "/signup", "/:username/opengraph-image"],
};
