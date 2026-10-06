import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthUser = {
  id: string;
  email: string | null;
};

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
  };
});

/** Use in protected Server Components. Redirects to /login if signed out. */
export async function requireUser() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return user;
}
