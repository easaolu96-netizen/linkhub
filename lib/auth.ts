import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthUser = {
  id: string;
  email: string | null;
  /** When the user last actually signed in (password, code or OAuth), not token refresh. */
  authenticatedAt: Date | null;
  /** When the user last proved access to their inbox with an emailed code (incl. password reset). */
  emailCodeVerifiedAt: Date | null;
  /** "aal2" once the authenticator code was entered in this session. */
  aal: "aal1" | "aal2" | null;
};

/**
 * Latest sign-in time from the JWT's `amr` claim (seconds since epoch),
 * optionally only for the given methods (e.g. "otp", "recovery").
 */
function lastAuthentication(amr: unknown, methods?: string[]): Date | null {
  if (!Array.isArray(amr)) return null;
  const timestamps = amr
    .map((entry: unknown) =>
      entry &&
      typeof entry === "object" &&
      "timestamp" in entry &&
      typeof entry.timestamp === "number" &&
      (!methods || ("method" in entry && methods.includes(String(entry.method))))
        ? entry.timestamp
        : null,
    )
    .filter((t): t is number => t !== null);
  return timestamps.length ? new Date(Math.max(...timestamps) * 1000) : null;
}

/**
 * The signed-in user, or null.
 *
 * Uses getClaims(), which verifies the JWT signature locally against the
 * project's public signing keys (cached in memory), so it costs no network
 * round trip — unlike getUser(), which calls Supabase Auth every time.
 * Wrapped in React `cache` so one request only verifies once.
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    authenticatedAt: lastAuthentication(claims.amr),
    emailCodeVerifiedAt: lastAuthentication(claims.amr, ["otp", "recovery"]),
    aal: claims.aal === "aal2" ? "aal2" : claims.aal === "aal1" ? "aal1" : null,
  };
});

/**
 * Use in protected Server Components. Redirects to /login if signed out, and
 * to the 2FA step if two-factor sign-in is on but the code wasn't entered.
 * (proxy.ts does the same, but server-action redirects skip the proxy.)
 */
export async function requireUser() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (user.aal !== "aal2") {
    const supabase = await createClient();
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.nextLevel === "aal2") redirect("/login/mfa");
  }
  return user;
}

/**
 * False if the user has two-factor sign-in on but hasn't entered the code in
 * this session. Asks Supabase Auth (not the cookie), so it can't be faked.
 * For privileged server code that bypasses RLS; RLS enforces this on its own.
 */
export async function isMfaSatisfied(user: AuthUser) {
  if (user.aal === "aal2") return true;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return false;
  return !data.totp.some((factor) => factor.status === "verified");
}

/** True if the user signed in within `maxAgeMs` (for sensitive actions). */
export function isRecentlyAuthenticated(user: AuthUser, maxAgeMs: number) {
  return user.authenticatedAt !== null && Date.now() - user.authenticatedAt.getTime() <= maxAgeMs;
}
