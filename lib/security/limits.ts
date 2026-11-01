import "server-only";
import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Database-backed rate limits for sensitive actions (login, sign-up, codes…).
 *
 * Unlike the in-memory limiter in lib/rate-limit.ts, these are shared by every
 * server instance, so they hold on serverless platforms like Vercel.
 * Subjects (IPs, emails, user ids) are HMAC-hashed before storage.
 */
export const LIMITS = {
  loginIp: { limit: 20, windowSeconds: 10 * 60 },
  loginEmail: { limit: 8, windowSeconds: 10 * 60 },
  signupIp: { limit: 10, windowSeconds: 60 * 60 },
  signupEmail: { limit: 3, windowSeconds: 60 * 60 },
  verifyIp: { limit: 30, windowSeconds: 15 * 60 },
  verifyEmail: { limit: 8, windowSeconds: 15 * 60 },
  resendIp: { limit: 10, windowSeconds: 60 * 60 },
  resendEmail: { limit: 4, windowSeconds: 60 * 60 },
  usernameChange: { limit: 10, windowSeconds: 60 * 60 },
  avatarChange: { limit: 20, windowSeconds: 60 * 60 },
  accountDelete: { limit: 5, windowSeconds: 60 * 60 },
} as const;

export type LimitName = keyof typeof LIMITS;

export const TOO_MANY_ATTEMPTS = "Too many attempts. Please wait a few minutes and try again.";

export const TOO_MANY_CHANGES = "You're making changes very quickly. Please wait a few minutes and try again.";

/**
 * True when the database's per-user write limit on links/profiles stopped the
 * query (trigger in migration 20261101000000_write_rate_limits.sql).
 */
export function isWriteRateLimited(error: { hint?: string | null } | null) {
  return error?.hint === "rate_limited";
}

function hashSubject(name: LimitName, subject: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "linkhub";
  return createHmac("sha256", secret).update(`${name}|${subject.trim().toLowerCase()}`).digest("base64url");
}

async function consume(name: LimitName, subject: string): Promise<boolean> {
  const { limit, windowSeconds } = LIMITS[name];
  try {
    const { data, error } = await createAdminClient().rpc("consume_rate_limit", {
      p_key: `${name}:${hashSubject(name, subject)}`,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    return data === true;
  } catch (error) {
    // Fail closed: if the limit can't be checked, refuse rather than let an
    // attacker get unlimited attempts while the check is broken. These are all
    // sensitive actions that also need the database, so an outage blocks them
    // anyway; a misconfiguration shows up loudly instead of silently.
    console.error(`[rate-limit] check "${name}" failed:`, error instanceof Error ? error.message : error);
    return false;
  }
}

/** Counts one attempt against every rule; returns false if any rule is exceeded. */
export async function withinLimits(checks: [LimitName, string][]): Promise<boolean> {
  const results = await Promise.all(checks.map(([name, subject]) => consume(name, subject)));
  return results.every(Boolean);
}
