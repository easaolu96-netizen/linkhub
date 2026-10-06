"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { SITE_URL } from "@/lib/env";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { emailCodeSchema, emailSchema, loginSchema, signupSchema } from "@/lib/validation/auth";

function friendlyAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Incorrect email or password.";
  if (m.includes("expired") || (m.includes("invalid") && m.includes("token")))
    return "That code is wrong or has expired. Check the latest email or request a new code.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes"))
    return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("weak") || m.includes("pwned"))
    return "That password is too weak or has appeared in a data breach. Try another.";
  return "Something went wrong. Please try again.";
}

async function getOrigin() {
  const h = await headers();
  return h.get("origin") ?? SITE_URL;
}

type NeedsCode = { needsConfirmation: true };

export async function login(input: unknown, next?: string): Promise<ActionResult<NeedsCode>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the errors below.", z.flattenError(parsed.error).fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error?.code === "email_not_confirmed" || error?.message.toLowerCase().includes("email not confirmed")) {
    // Correct password but the address was never confirmed: send a fresh code
    // and let the form switch to the "enter your code" step.
    await supabase.auth.resend({ type: "signup", email: parsed.data.email });
    return { ok: true, data: { needsConfirmation: true } };
  }
  if (error) return fail(friendlyAuthError(error.message));

  redirect(safeRedirectPath(next));
}

export async function signup(input: unknown, next?: string): Promise<ActionResult<NeedsCode>> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the errors below.", z.flattenError(parsed.error).fieldErrors);
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const afterConfirm = safeRedirectPath(next, "/onboarding");
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    // Only used if the email template also includes the confirmation link.
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(afterConfirm)}` },
  });
  if (error) return fail(friendlyAuthError(error.message));

  // With "Confirm email" enabled Supabase returns no session until the code is
  // entered. (It also returns no session for an already-registered email, so we
  // show the same step and don't reveal which emails have accounts.)
  if (!data.session) return { ok: true, data: { needsConfirmation: true } };

  redirect(afterConfirm);
}

/** Check the 6-digit code from the confirmation email and sign the user in. */
export async function verifyEmailCode(input: unknown, next?: string): Promise<ActionResult> {
  const parsed = emailCodeSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Enter the code from the email.", z.flattenError(parsed.error).fieldErrors);
  }
  const { email, code } = parsed.data;

  const supabase = await createClient();
  let { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) {
    // Older projects issue sign-up confirmations under the "signup" type.
    ({ error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" }));
  }
  if (error) return fail(friendlyAuthError(error.message));

  redirect(safeRedirectPath(next, "/onboarding"));
}

export async function resendEmailCode(email: unknown): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return fail("Invalid email address.");

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: parsed.data });
  if (error) return fail(friendlyAuthError(error.message));
  return { ok: true, data: undefined, message: "A new code is on its way." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
