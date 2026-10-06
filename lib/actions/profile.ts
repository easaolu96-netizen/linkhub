"use server";

import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { getAuthUser } from "@/lib/auth";
import type { Socials } from "@/lib/socials";
import { createClient } from "@/lib/supabase/server";
import { avatarPathSchema, profileUpdateSchema } from "@/lib/validation/profile";

const AVATAR_BUCKET = "avatars";

export async function updateProfile(input: unknown): Promise<
  ActionResult<{ display_name: string | null; bio: string | null; socials: Socials }>
> {
  const user = await getAuthUser();
  if (!user) return fail("You need to be signed in.");

  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", z.flattenError(parsed.error).fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return fail("Couldn't save your profile. Please try again.");

  return { ok: true, data: parsed.data, message: "Profile saved" };
}

/** Delete every file in the user's avatar folder except `keep`. */
async function cleanUpAvatars(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, keep?: string) {
  const { data: files } = await supabase.storage.from(AVATAR_BUCKET).list(userId, { limit: 100 });
  const stale = (files ?? []).map((f) => `${userId}/${f.name}`).filter((path) => path !== keep);
  if (stale.length > 0) await supabase.storage.from(AVATAR_BUCKET).remove(stale);
}

/**
 * Called after the browser uploaded a cropped avatar straight to Storage
 * (Storage RLS only lets users write inside their own "<user id>/" folder).
 */
export async function setAvatar(path: unknown): Promise<ActionResult<{ avatar_url: string }>> {
  const user = await getAuthUser();
  if (!user) return fail("You need to be signed in.");

  const parsed = avatarPathSchema.safeParse(path);
  if (!parsed.success || !parsed.data.startsWith(`${user.id}/`)) return fail("Invalid upload.");

  const supabase = await createClient();
  const storage = supabase.storage.from(AVATAR_BUCKET);

  // Make sure the file really exists before pointing the profile at it.
  const fileName = parsed.data.slice(user.id.length + 1);
  const { data: found } = await storage.list(user.id, { search: fileName, limit: 1 });
  if (!found?.some((f) => f.name === fileName)) return fail("Upload not found. Please try again.");

  const avatar_url = storage.getPublicUrl(parsed.data).data.publicUrl;
  const { error } = await supabase.from("profiles").update({ avatar_url }).eq("id", user.id);
  if (error) return fail("Couldn't save your avatar. Please try again.");

  await cleanUpAvatars(supabase, user.id, parsed.data);
  return { ok: true, data: { avatar_url }, message: "Avatar updated" };
}

export async function removeAvatar(): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return fail("You need to be signed in.");

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  if (error) return fail("Couldn't remove your avatar. Please try again.");

  await cleanUpAvatars(supabase, user.id);
  return { ok: true, data: undefined, message: "Avatar removed" };
}
