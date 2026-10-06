"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { getAuthUser } from "@/lib/auth";
import { getCurrentProfile } from "@/lib/profile";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-info";
import { audit } from "@/lib/security/audit";
import { TOO_MANY_ATTEMPTS, withinLimits } from "@/lib/security/limits";
import { createClient } from "@/lib/supabase/server";
import { claimUsernameSchema, usernameSchema } from "@/lib/validation/username";

export type UsernameAvailability =
  | { status: "available"; username: string }
  | { status: "current"; username: string }
  | { status: "taken" | "invalid"; username: string; message: string };

/** Public: used by onboarding, settings and the landing page "claim" box. */
export async function checkUsernameAvailability(raw: unknown): Promise<UsernameAvailability> {
  const input = typeof raw === "string" ? raw.slice(0, 64) : "";
  const parsed = usernameSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "invalid",
      username: input,
      message: parsed.error.issues[0]?.message ?? "Invalid username",
    };
  }
  const username = parsed.data;

  // Unauthenticated and called as people type: cheap per-IP cap against scraping.
  if (!rateLimit(`username-check:${getClientIp(await headers())}`, 90, 60_000)) {
    return { status: "invalid", username, message: "Too many checks — wait a moment and try again" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (error) return { status: "invalid", username, message: "Couldn't check right now" };
  if (!data) return { status: "available", username };

  const user = await getAuthUser();
  if (user && data.id === user.id) return { status: "current", username };
  return { status: "taken", username, message: "That username is already taken" };
}

/** Claim (onboarding) or change (settings) the signed-in user's username. */
export async function setUsername(input: unknown): Promise<ActionResult<{ username: string }>> {
  const user = await getAuthUser();
  if (!user) return fail("You need to be signed in.");

  const parsed = claimUsernameSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please choose a valid username.", z.flattenError(parsed.error).fieldErrors);
  }
  const { username } = parsed.data;

  if (!(await withinLimits([["usernameChange", user.id]]))) return fail(TOO_MANY_ATTEMPTS);
  const previous = (await getCurrentProfile())?.username ?? null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", user.id)
    .select("username")
    .maybeSingle();

  if (error) {
    // 23505 = unique_violation (someone grabbed it first), 23514 = check_violation
    if (error.code === "23505") {
      return fail("That username was just taken. Try another.", {
        username: ["That username is already taken"],
      });
    }
    if (error.code === "23514") return fail("That username isn't allowed.");
    return fail("Couldn't save your username. Please try again.");
  }
  if (!data) return fail("Profile not found. Please sign out and back in.");

  await audit("username.changed", { userId: user.id, metadata: { from: previous, to: username } });
  revalidatePath("/", "layout");
  return { ok: true, data: { username }, message: `@${username} is yours!` };
}
