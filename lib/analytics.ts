import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Analytics tables have no INSERT policy, so only the service-role client
// (server-side) can write to them. Failures are logged, never shown to visitors.

export async function recordPageView(view: {
  profileId: string;
  referrer: string | null;
  country: string | null;
}) {
  const { error } = await createAdminClient().from("page_views").insert({
    profile_id: view.profileId,
    referrer: view.referrer,
    country: view.country,
  });
  if (error) console.error("[analytics] failed to record page view:", error.message);
}

export async function recordLinkClick(click: {
  linkId: string;
  profileId: string;
  referrer: string | null;
}) {
  const { error } = await createAdminClient().from("link_clicks").insert({
    link_id: click.linkId,
    profile_id: click.profileId,
    referrer: click.referrer,
  });
  if (error) console.error("[analytics] failed to record link click:", error.message);
}
