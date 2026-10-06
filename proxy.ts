import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only run where auth matters. Public profile pages, the landing page and
  // static assets skip the proxy entirely so they stay fast.
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/login", "/signup"],
};
