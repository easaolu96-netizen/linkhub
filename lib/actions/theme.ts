"use server";

import { fail, type ActionResult } from "@/lib/action-result";
import { getAuthUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { themeSchema, type Theme } from "@/lib/theme";

export async function saveTheme(input: unknown): Promise<ActionResult<Theme>> {
  const user = await getAuthUser();
  if (!user) return fail("You need to be signed in.");

  const parsed = themeSchema.safeParse(input);
  if (!parsed.success) return fail("Some appearance settings are invalid.");

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ theme: parsed.data }).eq("id", user.id);
  if (error) return fail("Couldn't save your appearance. Please try again.");

  return { ok: true, data: parsed.data, message: "Appearance saved" };
}
