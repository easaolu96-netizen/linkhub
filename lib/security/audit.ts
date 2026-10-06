import "server-only";
import { headers } from "next/headers";
import { after } from "next/server";
import { getClientIp } from "@/lib/request-info";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

export type AuditEvent =
  | "login.succeeded"
  | "login.failed"
  | "login.unconfirmed"
  | "login.rate_limited"
  | "signup.requested"
  | "signup.rate_limited"
  | "email.verified"
  | "email.verify_failed"
  | "email.verify_rate_limited"
  | "email.code_resent"
  | "email.resend_rate_limited"
  | "oauth.login"
  | "oauth.failed"
  | "logout"
  | "username.changed"
  | "avatar.changed"
  | "account.deleted"
  | "account.delete_reauth_required"
  | "rate_limited";

/**
 * Record a security event in public.audit_logs (service role only; no client
 * can read or write that table). Written after the response is sent so it
 * never slows a request down, and never throws.
 *
 * NEVER pass passwords, codes, tokens or keys in `metadata`.
 */
export async function audit(
  event: AuditEvent,
  details: { userId?: string | null; email?: string | null; metadata?: Record<string, Json> } = {},
) {
  let ip: string | null = null;
  let userAgent: string | null = null;
  try {
    const h = await headers();
    ip = getClientIp(h).slice(0, 64);
    userAgent = h.get("user-agent")?.slice(0, 300) ?? null;
  } catch {
    // Not in a request context (e.g. a script) — log without request info.
  }

  const row = {
    event,
    user_id: details.userId ?? null,
    email: details.email?.trim().toLowerCase().slice(0, 254) ?? null,
    ip,
    user_agent: userAgent,
    metadata: details.metadata ?? {},
  };

  after(async () => {
    const { error } = await createAdminClient().from("audit_logs").insert(row);
    if (error) console.error(`[audit] failed to record ${event}:`, error.message);
  });
}
