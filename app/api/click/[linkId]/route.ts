import { NextResponse, after, type NextRequest } from "next/server";
import { z } from "zod";
import { recordLinkClick } from "@/lib/analytics";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, getReferrerOrigin, isBot, isPrefetch } from "@/lib/request-info";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSafeHref } from "@/lib/validation/link";

const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

/**
 * GET /api/click/:linkId — records a click, then 302-redirects to the link.
 * Hidden or deleted links 404 so old URLs can't be used to reach them.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/click/[linkId]">) {
  const { linkId } = await ctx.params;
  if (!z.uuid().safeParse(linkId).success) {
    return new NextResponse("Link not found", { status: 404, headers: NO_STORE });
  }

  const ip = getClientIp(request.headers);
  if (!rateLimit(`clicks:${ip}`, 30, 60_000)) {
    return new NextResponse("Too many requests — please slow down.", {
      status: 429,
      headers: { ...NO_STORE, "Retry-After": "60" },
    });
  }

  // Service role: works regardless of who is clicking; we check visibility ourselves.
  const { data: link } = await createAdminClient()
    .from("links")
    .select("id, url, user_id, is_visible")
    .eq("id", linkId)
    .maybeSingle();

  if (!link || !link.is_visible || !isSafeHref(link.url)) {
    return new NextResponse("Link not found", { status: 404, headers: NO_STORE });
  }

  const shouldTrack =
    !isBot(request.headers.get("user-agent")) &&
    !isPrefetch(request.headers) &&
    // Count a double-click / repeat tap on the same link once per 10 s.
    rateLimit(`click:${ip}:${link.id}`, 1, 10_000);

  if (shouldTrack) {
    const referrer = getReferrerOrigin(request.headers, request.nextUrl.host);
    after(() => recordLinkClick({ linkId: link.id, profileId: link.user_id, referrer }));
  }

  return NextResponse.redirect(link.url, { status: 302, headers: NO_STORE });
}
