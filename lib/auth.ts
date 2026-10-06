import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthUser = {
  id: string;
  email: string | null;
  /** When the user last actually signed in (password, code or OAuth), not token refresh. */
  authenticatedAt: Date | null;
};

/** Latest sign-in time from the JWT's `amr` claim (seconds since epoch). */
function lastAuthentication(amr: unknown): Date | null {
  if (!Array.isArray(amr)) return null;
  const timestamps = amr
    .map((entry: unknown) =>
      entry && typeof entry === "object" && "timestamp" in entry && typeof entry.timestamp === "number"
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
  };
});

/** Use in protected Server Components. Redirects to /login if signed out. */
export async function requireUser() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return user;
}

/** True if the user signed in within `maxAgeMs` (for sensitive actions). */
export function isRecentlyAuthenticated(user: AuthUser, maxAgeMs: number) {
  return user.authenticatedAt !== null && Date.now() - user.authenticatedAt.getTime() <= maxAgeMs;
}
