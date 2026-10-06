import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-info";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { audit } from "@/lib/security/audit";
import { createClient } from "@/lib/supabase/server";

// Only the link types this app actually sends (sign-up confirmation).
// Recovery / magic-link / invite flows aren't used, so they aren't accepted.
const EMAIL_OTP_TYPES: readonly EmailOtpType[] = ["signup", "email"];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (EMAIL_OTP_TYPES as readonly string[]).includes(value);
}

function toLogin(origin: string, error: "link_invalid" | "signin_failed" | "rate_limited") {
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", error);
  return NextResponse.redirect(loginUrl);
}

/**
 * Landing point for Google OAuth and email-confirmation links.
 * Exchanges the one-time code (or token hash) for a session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  if (!rateLimit(`auth-callback:${getClientIp(request.headers)}`, 30, 10 * 60_000)) {
    return toLogin(origin, "rate_limited");
  }

  const next = safeRedirectPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const supabase = await createClient();

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await audit("oauth.login", {
        userId: data.user.id,
        email: data.user.email,
        metadata: { provider: data.user.app_metadata.provider ?? "unknown" },
      });
      return NextResponse.redirect(new URL(next, origin));
    }
    await audit("oauth.failed", { metadata: { reason: error.code ?? "exchange_failed" } });
    return toLogin(origin, "link_invalid");
  }

  if (tokenHash && isEmailOtpType(type)) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      await audit("email.verified", { userId: data.user?.id, email: data.user?.email, metadata: { via: "link" } });
      return NextResponse.redirect(new URL(next, origin));
    }
    await audit("email.verify_failed", { metadata: { via: "link" } });
    return toLogin(origin, "link_invalid");
  }

  return toLogin(origin, "signin_failed");
}
