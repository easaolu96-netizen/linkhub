import "server-only";
import { cache } from "react";
import { getAuthUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** The signed-in user's profile row (or null if signed out). Cached per request. */
export const getCurrentProfile = cache(async () => {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw new Error(`Failed to load profile: ${error.message}`);
  return data;
});
