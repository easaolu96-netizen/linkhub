"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { getAuthUser, type AuthUser } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";
import { getClientIp } from "@/lib/request-info";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { audit } from "@/lib/security/audit";
import { TOO_MANY_ATTEMPTS, withinLimits } from "@/lib/security/limits";
import { createClient } from "@/lib/supabase/server";
import {
  emailCodeSchema,
  emailSchema,
  loginSchema,
  setPasswordSchema,
  signupSchema,
} from "@/lib/validation/auth";

// Sign-in goes through this server, so Supabase's own per-IP limits only see
// the server's address. These actions therefore apply their own limits per
// client IP *and* per email address (see lib/security/limits.ts).

function friendlyAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("captcha")) return "The security check failed or expired. Please try again.";
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

/**
 * Cloudflare Turnstile token from the form. Supabase verifies it (when CAPTCHA
 * protection is on in the dashboard); here we only make sure it's a sane string.
 */
function captchaOption(token: unknown) {
  return typeof token === "string" && token.length > 0 && token.length <= 4096
    ? { captchaToken: token }
    : {};
}

/** `codeSent` is false when the user still has to request a code themselves. */
type NeedsCode = { needsConfirmation: true; codeSent: boolean };

export async function login(
  input: unknown,
  next?: string,
  captchaToken?: unknown,
): Promise<ActionResult<NeedsCode>> {
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
  const { data, error } = await supabase.auth.signInWithPassword({
    ...parsed.data,
    options: captchaOption(captchaToken),
  });

  if (error?.code === "email_not_confirmed" || error?.message.toLowerCase().includes("email not confirmed")) {
    // Correct password but the address was never confirmed: switch the form to
    // the "enter code" step. No code is sent from here, because the CAPTCHA
    // token was single-use and is already spent; the step asks the user to
    // request one (with a fresh check).
    await audit("login.unconfirmed", { email });
    return { ok: true, data: { needsConfirmation: true, codeSent: false } };
  }
  if (error) {
    await audit("login.failed", { email, metadata: { reason: error.code ?? "unknown" } });
    return fail(friendlyAuthError(error.message));
  }

  await audit("login.succeeded", { userId: data.user.id, email, metadata: { method: "password" } });
  const destination = safeRedirectPath(next);
  if (data.user.factors?.some((f) => f.status === "verified")) {
    redirect(`/login/mfa?next=${encodeURIComponent(destination)}`);
  }
  redirect(destination);
}

export async function signup(
  input: unknown,
  next?: string,
  captchaToken?: unknown,
): Promise<ActionResult<NeedsCode>> {
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
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(afterConfirm)}`,
      ...captchaOption(captchaToken),
    },
  });
  if (error) return fail(friendlyAuthError(error.message));
  await audit("signup.requested", { email });

  // With "Confirm email" enabled Supabase returns no session until the code is
  // entered. (It also returns no session for an already-registered email, so we
  // show the same step and don't reveal which emails have accounts.)
  if (!data.session) return { ok: true, data: { needsConfirmation: true, codeSent: true } };

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

export async function resendEmailCode(email: unknown, captchaToken?: unknown): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return fail("Invalid email address.");

  if (!(await withinLimits([["resendIp", await clientIp()], ["resendEmail", parsed.data]]))) {
    await audit("email.resend_rate_limited", { email: parsed.data });
    return fail(TOO_MANY_ATTEMPTS);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: captchaOption(captchaToken),
  });
  if (error) return fail(friendlyAuthError(error.message));
  await audit("email.code_resent", { email: parsed.data });
  return { ok: true, data: undefined, message: "A new code is on its way." };
}

// ---------------------------------------------------------------------
// Password reset: email → 8-digit code → new password.
// ---------------------------------------------------------------------

const RESET_SENT = "If that email has an account, a reset code is on its way.";

/** Step 1: email a reset code. Same answer whether or not the account exists. */
export async function requestPasswordReset(email: unknown, captchaToken?: unknown): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return fail("Enter a valid email address.");

  if (!(await withinLimits([["resetIp", await clientIp()], ["resetEmail", parsed.data]]))) {
    await audit("password.reset_rate_limited", { email: parsed.data });
    return fail(TOO_MANY_ATTEMPTS);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, captchaOption(captchaToken));
  if (error) console.error("[auth] password reset request failed:", error.code ?? error.status);
  // Only surface errors that don't reveal whether the account exists.
  if (error && /captcha|rate limit|too many|security purposes/i.test(error.message)) {
    return fail(friendlyAuthError(error.message));
  }
  await audit("password.reset_requested", { email: parsed.data });
  return { ok: true, data: undefined, message: RESET_SENT };
}

/**
 * Step 2: check the code. On success the user has a short-lived signed-in
 * session; `mfaRequired` means they must enter their authenticator code before
 * Supabase will accept a new password.
 */
export async function verifyResetCode(input: unknown): Promise<ActionResult<{ mfaRequired: boolean }>> {
  const parsed = emailCodeSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Enter the code from the email.", z.flattenError(parsed.error).fieldErrors);
  }
  const { email, code } = parsed.data;

  if (!(await withinLimits([["resetVerifyIp", await clientIp()], ["resetVerifyEmail", email]]))) {
    await audit("password.reset_rate_limited", { email, metadata: { step: "verify" } });
    return fail(TOO_MANY_ATTEMPTS);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
  if (error) {
    await audit("password.reset_code_failed", { email });
    return fail(friendlyAuthError(error.message));
  }
  await audit("password.reset_code_verified", { userId: data.user?.id, email });
  const mfaRequired = data.user?.factors?.some((f) => f.status === "verified") ?? false;
  return { ok: true, data: { mfaRequired } };
}

/** A new password may be set only shortly after proving inbox access with a code. */
const SET_PASSWORD_WINDOW_MS = 15 * 60 * 1000;

function canSetPassword(user: AuthUser) {
  return (
    user.emailCodeVerifiedAt !== null &&
    Date.now() - user.emailCodeVerifiedAt.getTime() <= SET_PASSWORD_WINDOW_MS
  );
}

/** Step 3: set the new password, sign out every other device, go to the dashboard. */
export async function setNewPassword(input: unknown): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user || !canSetPassword(user)) {
    return fail("Your reset session has expired. Please request a new code.");
  }

  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the errors below.", z.flattenError(parsed.error).fieldErrors);
  }
  if (!(await withinLimits([["passwordSet", user.id]]))) return fail(TOO_MANY_ATTEMPTS);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return fail("Choose a password you haven't used for this account.");
    if (error.code === "insufficient_aal") return fail("Enter your authenticator code first.");
    return fail(friendlyAuthError(error.message));
  }

  // Anyone who got into the account with the old password is logged out.
  await supabase.auth.signOut({ scope: "others" });
  await audit("password.changed", { userId: user.id, email: user.email, metadata: { via: "reset" } });
  redirect("/dashboard");
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
