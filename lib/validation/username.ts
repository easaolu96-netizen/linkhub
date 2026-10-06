import { z } from "zod";

// Keep in sync with public.is_reserved_username() in supabase/migrations.
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  "admin",
  "api",
  "dashboard",
  "login",
  "signup",
  "settings",
  "about",
  "help",
  "terms",
  "privacy",
  "www",
  "app",
  "auth",
  "onboarding",
  "logout",
]);

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN, `At least ${USERNAME_MIN} characters`)
  .max(USERNAME_MAX, `At most ${USERNAME_MAX} characters`)
  .regex(/^[a-z0-9_-]+$/, "Only lowercase letters, numbers, _ and -")
  .refine((name) => !RESERVED_USERNAMES.has(name), "That username is reserved");

/** Lowercase and strip characters that can never be part of a username. */
export function normalizeUsernameInput(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, USERNAME_MAX);
}

/** Best-effort suggestion from a display name or email, e.g. "Jane Doe" → "janedoe". */
export function suggestUsername(source: string | null | undefined) {
  if (!source) return "";
  const base = normalizeUsernameInput(source.split("@")[0]?.replace(/[.\s]+/g, "") ?? "");
  return base.length >= USERNAME_MIN && !RESERVED_USERNAMES.has(base) ? base : "";
}

export const claimUsernameSchema = z.object({ username: usernameSchema });
