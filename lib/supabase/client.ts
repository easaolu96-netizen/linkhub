import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { AUTH_COOKIE_OPTIONS } from "./cookie-options";
import type { Database } from "./database.types";

/** Supabase client for Client Components (runs in the browser). */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
  });
}
