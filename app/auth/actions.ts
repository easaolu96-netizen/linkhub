"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { getAuthUser } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";
import { getClientIp } from "@/lib/request-info";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { audit } from "@/lib/security/audit";
import { TOO_MANY_ATTEMPTS, withinLimits } from "@/lib/security/limits";
import { createClient } from "@/lib/supabase/server";
import { emailCodeSchema, emailSchema, loginSchema, signupSchema } from "@/lib/validation/auth";

// Sign-in goes through this server, so Supabase's own per-IP limits only see
// the server's address. These actions therefore apply their own limits per
// client IP *and* per email address (see lib/security/limits.ts).

function friendlyAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Incorrect email or password.";
  if (m.includes("expired") || (m.includes("invalid") && m.includes("token")))
    return "That code is wrong or has expired. Check the latest email or request a new code.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes"))
    return TOO_MANY_ATTEMPTS;
  if (m.includes("weak") || m.includes("pwned"))
    return "That password is too weak or has appeared in a data breach. Try another.";
  return "Something went wrong. Please try again.";
}

async function clientIp() {
  return getClientIp(await headers());
}

type NeedsCode = { needsConfirmation: true };

export async function login(input: unknown, next?: string): Promise<ActionResult<NeedsCode>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the errors below.", z.flattenError(parsed.error).fieldErrors);
  }
  const { email } = parsed.data;

  if (!(await withinLimits([["loginIp", await clientIp()], ["loginEmail", email]]))) {
    await audit("login.rate_limited", { email });
    return fail(TOO_MANY_ATTEMPTS);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error?.code === "email_not_confirmed" || error?.message.toLowerCase().includes("email not confirmed")) {
    // Correct password but the address was never confirmed: send a fresh code
    // (within the resend limits) and switch the form to the "enter code" step.
    await audit("login.unconfirmed", { email });
    if (await withinLimits([["resendEmail", email]])) {
      await supabase.auth.resend({ type: "signup", email });
    }
    return { ok: true, data: { needsConfirmation: true } };
  }
  if (error) {
    await audit("login.failed", { email, metadata: { reason: error.code ?? "unknown" } });
    return fail(friendlyAuthError(error.message));
  }

  await audit("login.succeeded", { userId: data.user.id, email, metadata: { method: "password" } });
  redirect(safeRedirectPath(next));
}

export async function signup(input: unknown, next?: string): Promise<ActionResult<NeedsCode>> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the errors below.", z.flattenError(parsed.error).fieldErrors);
  }
  const { email } = parsed.data;

  if (!(await withinLimits([["signupIp", await clientIp()], ["signupEmail", email]]))) {
    await audit("signup.rate_limited", { email });
    return fail(TOO_MANY_ATTEMPTS);
  }

  const supabase = await createClient();
  const afterConfirm = safeRedirectPath(next, "/onboarding");
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    // Only used if the email template also includes the confirmation link.
    // Built from the configured site URL, never from request headers.
    options: { emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(afterConfirm)}` },
  });
  if (error) return fail(friendlyAuthError(error.message));
  await audit("signup.requested", { email });

  // With "Confirm email" enabled Supabase returns no session until the code is
  // entered. (It also returns no session for an already-registered email, so we
  // show the same step and don't reveal which emails have accounts.)
  if (!data.session) return { ok: true, data: { needsConfirmation: true } };

  redirect(afterConfirm);
}

/** Check the code from the confirmation email and sign the user in. */
export async function verifyEmailCode(input: unknown, next?: string): Promise<ActionResult> {
  const parsed = emailCodeSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Enter the code from the email.", z.flattenError(parsed.error).fieldErrors);
  }
  const { email, code } = parsed.data;

  if (!(await withinLimits([["verifyIp", await clientIp()], ["verifyEmail", email]]))) {
    await audit("email.verify_rate_limited", { email });
    return fail(TOO_MANY_ATTEMPTS);
  }

  const supabase = await createClient();
  let { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) {
    // Older projects issue sign-up confirmations under the "signup" type.
    ({ data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" }));
  }
  if (error) {
    await audit("email.verify_failed", { email });
    return fail(friendlyAuthError(error.message));
  }

  await audit("email.verified", { userId: data.user?.id, email });
  redirect(safeRedirectPath(next, "/onboarding"));
}

export async function resendEmailCode(email: unknown): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return fail("Invalid email address.");

  if (!(await withinLimits([["resendIp", await clientIp()], ["resendEmail", parsed.data]]))) {
    await audit("email.resend_rate_limited", { email: parsed.data });
    return fail(TOO_MANY_ATTEMPTS);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: parsed.data });
  if (error) return fail(friendlyAuthError(error.message));
  await audit("email.code_resent", { email: parsed.data });
  return { ok: true, data: undefined, message: "A new code is on its way." };
}

export async function signOut() {
  const user = await getAuthUser();
  const supabase = await createClient();
  await supabase.auth.signOut();
  if (user) await audit("logout", { userId: user.id, email: user.email });
  redirect("/login");
}

/** Sign out and come back to Settings after logging in again (for sensitive actions). */
export async function reauthenticate() {
  const supabase = await createClient();
  // Only this browser: re-confirming identity shouldn't log out other devices.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?next=%2Fdashboard%2Fsettings&reauth=1");
}
