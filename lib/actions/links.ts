"use server";

import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { getAuthUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import {
  linkInputSchema,
  linkUpdateSchema,
  MAX_LINKS,
  reorderSchema,
} from "@/lib/validation/link";

// The public profile page is rendered fresh on every request, so these
// actions don't need to revalidate any cached pages.

type Link = Tables<"links">;

export async function createLink(input: unknown): Promise<ActionResult<Link>> {
  const user = await getAuthUser();
  if (!user) return fail("You need to be signed in.");

  const parsed = linkInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the errors below.", z.flattenError(parsed.error).fieldErrors);
  }

  const supabase = await createClient();
  // One round trip: limit check + "add to top" position + insert (see migration).
  const { data, error } = await supabase.rpc("create_link", {
    p_title: parsed.data.title,
    p_url: parsed.data.url,
  });

  if (error) {
    if (error.hint === "max_links") return fail(`You can have up to ${MAX_LINKS} links.`);
    return fail("Couldn't add the link. Please try again.");
  }
  return { ok: true, data, message: "Link added" };
}

export async function updateLink(input: unknown): Promise<ActionResult<Link>> {
  const user = await getAuthUser();
  if (!user) return fail("You need to be signed in.");

  const parsed = linkUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the errors below.", z.flattenError(parsed.error).fieldErrors);
  }
  const { id, ...changes } = parsed.data;
  if (Object.keys(changes).length === 0) return fail("Nothing to update.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("links")
    .update(changes)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) return fail("Couldn't save the link. Please try again.");
  if (!data) return fail("Link not found.");
  return { ok: true, data };
}

export async function deleteLink(id: unknown): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return fail("You need to be signed in.");

  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return fail("Invalid link.");

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("links")
    .delete({ count: "exact" })
    .eq("id", parsed.data)
    .eq("user_id", user.id);

  if (error) return fail("Couldn't delete the link. Please try again.");
  if (!count) return fail("Link not found.");
  return { ok: true, data: undefined, message: "Link deleted" };
}

export async function reorderLinks(ids: unknown): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return fail("You need to be signed in.");

  const parsed = reorderSchema.safeParse(ids);
  if (!parsed.success) return fail("Invalid order.");

  const supabase = await createClient();
  // Runs as the user (security invoker), so it can only touch their own links.
  const { error } = await supabase.rpc("reorder_links", { link_ids: parsed.data });
  if (error) return fail("Couldn't save the new order. Please try again.");
  return { ok: true, data: undefined };
}
