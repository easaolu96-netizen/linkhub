"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { SITE_URL } from "@/lib/env";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validation/auth";

function friendlyAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Incorrect email or password.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("weak") || m.includes("pwned"))
    return "That password is too weak or has appeared in a data breach. Try another.";
  return "Something went wrong. Please try again.";
}

async function getOrigin() {
  const h = await headers();
  return h.get("origin") ?? SITE_URL;
}

export async function login(input: unknown, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the errors below.", z.flattenError(parsed.error).fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return fail(friendlyAuthError(error.message));

  redirect(safeRedirectPath(next));
}

export async function signup(
  input: unknown,
  next?: string,
): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the errors below.", z.flattenError(parsed.error).fieldErrors);
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const afterConfirm = safeRedirectPath(next, "/onboarding");
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(afterConfirm)}`,
    },
  });
  if (error) return fail(friendlyAuthError(error.message));

  // With "Confirm email" enabled Supabase returns no session until the link is
  // clicked. (It also returns no session for an already-registered email, so we
  // show the same message and don't reveal which emails have accounts.)
  if (!data.session) return { ok: true, data: { needsConfirmation: true } };

  redirect(afterConfirm);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
