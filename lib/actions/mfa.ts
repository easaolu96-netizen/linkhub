"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { getAuthUser, type AuthUser } from "@/lib/auth";
import { getClientIp } from "@/lib/request-info";
import { audit } from "@/lib/security/audit";
import { TOO_MANY_ATTEMPTS, withinLimits } from "@/lib/security/limits";
import { createClient } from "@/lib/supabase/server";

// Two-factor sign-in with an authenticator app (TOTP), done server-side so
// every attempt is rate-limited per user and per IP and written to the audit
// log. The database enforces it too (migration 20261101010000_mfa_enforcement).

const codeSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app"));

const WRONG_CODE = "That code didn't work. Check your authenticator app and try again.";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function verifiedTotpFactor(supabase: Supabase) {
  const { data } = await supabase.auth.mfa.listFactors();
  return data?.totp.find((f) => f.status === "verified") ?? null;
}

/** Counts one attempt per user and per IP; logs when the limit is hit. */
async function withinMfaLimits(user: AuthUser) {
  const ip = getClientIp(await headers());
  if (await withinLimits([["mfaVerifyIp", ip], ["mfaVerifyUser", user.id]])) return true;
  await audit("mfa.rate_limited", { userId: user.id, email: user.email });
  return false;
}

/** Check a code against a factor; upgrades this session to aal2 on success. */
async function checkCode(supabase: Supabase, factorId: string, code: string) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  return !error;
}

/** Settings: is 2FA on for this account? */
export async function getMfaEnabled(): Promise<boolean> {
  const supabase = await createClient();
  return (await verifiedTotpFactor(supabase)) !== null;
}

/** Step 1 of turning 2FA on: create an unverified factor and return its QR code. */
export async function startMfaEnrollment(): Promise<
  ActionResult<{ factorId: string; qrCode: string; secret: string }>
> {
  const user = await getAuthUser();
  if (!user) return fail("You need to be signed in.");
  if (!(await withinLimits([["mfaEnroll", user.id]]))) return fail(TOO_MANY_ATTEMPTS);

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (factors?.totp.some((f) => f.status === "verified")) {
    return fail("Two-factor sign-in is already on.");
  }
  // Clear abandoned attempts (an unverified factor blocks a new one).
  for (const factor of factors?.all ?? []) {
    if (factor.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `Authenticator ${new Date().toISOString().slice(0, 16)}`,
    issuer: "LinkHub",
  });
  if (error || !data) return fail("Couldn't start the setup. Please try again.");
  return {
    ok: true,
    data: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret },
  };
}

/** Step 2: the first code from the app proves it's set up; 2FA is now on. */
export async function confirmMfaEnrollment(factorId: unknown, code: unknown): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return fail("You need to be signed in.");
  const id = z.uuid().safeParse(factorId);
  const parsed = codeSchema.safeParse(code);
  if (!id.success) return fail("Setup expired. Please start again.");
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  if (!(await withinMfaLimits(user))) return fail(TOO_MANY_ATTEMPTS);

  const supabase = await createClient();
  if (!(await checkCode(supabase, id.data, parsed.data))) {
    await audit("mfa.failed", { userId: user.id, email: user.email, metadata: { step: "enroll" } });
    return fail(WRONG_CODE);
  }
  await audit("mfa.enabled", { userId: user.id, email: user.email });
  revalidatePath("/dashboard/settings");
  return { ok: true, data: undefined, message: "Two-factor sign-in is on" };
}

/** Sign-in step: the code after the password / Google / email code. */
export async function verifyMfa(code: unknown): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return fail("Your session has expired. Please log in again.");
  const parsed = codeSchema.safeParse(code);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  if (!(await withinMfaLimits(user))) return fail(TOO_MANY_ATTEMPTS);

  const supabase = await createClient();
  const factor = await verifiedTotpFactor(supabase);
  if (!factor) return { ok: true, data: undefined }; // 2FA isn't on: nothing to check
  if (!(await checkCode(supabase, factor.id, parsed.data))) {
    await audit("mfa.failed", { userId: user.id, email: user.email, metadata: { step: "login" } });
    return fail(WRONG_CODE);
  }
  await audit("mfa.verified", { userId: user.id, email: user.email });
  return { ok: true, data: undefined };
}

/** Turn 2FA off. Needs a current code, so an unattended open session isn't enough. */
export async function disableMfa(code: unknown): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return fail("You need to be signed in.");
  const parsed = codeSchema.safeParse(code);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  if (!(await withinMfaLimits(user))) return fail(TOO_MANY_ATTEMPTS);

  const supabase = await createClient();
  const factor = await verifiedTotpFactor(supabase);
  if (!factor) return fail("Two-factor sign-in is already off.");
  if (!(await checkCode(supabase, factor.id, parsed.data))) {
    await audit("mfa.failed", { userId: user.id, email: user.email, metadata: { step: "disable" } });
    return fail(WRONG_CODE);
  }
  const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
  if (error) return fail("Couldn't turn off two-factor sign-in. Please try again.");
  await audit("mfa.disabled", { userId: user.id, email: user.email });
  revalidatePath("/dashboard/settings");
  return { ok: true, data: undefined, message: "Two-factor sign-in is off" };
}
