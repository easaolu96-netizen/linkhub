"use server";

import { redirect } from "next/navigation";
import { fail, type ActionResult } from "@/lib/action-result";
import { getAuthUser, isRecentlyAuthenticated } from "@/lib/auth";
import { getCurrentProfile } from "@/lib/profile";
import { audit } from "@/lib/security/audit";
import { TOO_MANY_ATTEMPTS, withinLimits } from "@/lib/security/limits";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Deleting an account requires having signed in within this window. */
const REAUTH_WINDOW_MS = 2 * 60 * 60 * 1000;

/**
 * Permanently delete the signed-in user's account.
 * Deleting the auth user cascades (via foreign keys) to their profile, links,
 * page views and link clicks. Avatar files live in Storage, so we remove those first.
 */
export async function deleteAccount(confirmation: unknown): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return fail("You need to be signed in.");

  if (!(await withinLimits([["accountDelete", user.id]]))) return fail(TOO_MANY_ATTEMPTS);

  const profile = await getCurrentProfile();
  if (!profile?.username || typeof confirmation !== "string" || confirmation.trim() !== profile.username) {
    return fail("Type your username exactly to confirm.");
  }

  // A forgotten open session (shared computer, stolen cookie) shouldn't be
  // enough to destroy the account: require a recent sign-in.
  if (!isRecentlyAuthenticated(user, REAUTH_WINDOW_MS)) {
    await audit("account.delete_reauth_required", { userId: user.id, email: user.email });
    return fail("For your security, please log in again before deleting your account.", {
      reauth: ["required"],
    });
  }

  const admin = createAdminClient();

  const { data: files } = await admin.storage.from("avatars").list(user.id, { limit: 1000 });
  if (files && files.length > 0) {
    await admin.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return fail("Couldn't delete your account. Please try again.");

  await audit("account.deleted", { userId: user.id, email: user.email, metadata: { username: profile.username } });

  // The user no longer exists, so just clear the session cookies locally.
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  redirect("/?deleted=1");
}
