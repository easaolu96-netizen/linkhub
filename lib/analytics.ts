import "server-only";
import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Analytics tables have no INSERT policy, so only the service-role client
// (server-side) can write to them. Failures are logged, never shown to visitors.
//
// Counts are unique per visitor per day: the database ignores a second view
// of the same profile (or click on the same link) with the same visitor hash
// (see migration 20261101020000_unique_daily_analytics.sql).

/**
 * Anonymous per-day visitor id: HMAC of the UTC date + IP + user agent.
 * Changes every day, so visits can't be linked across days, and the IP can't
 * be recovered from it.
 */
export function visitorHash(ip: string, userAgent: string | null) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "linkhub";
  const day = new Date().toISOString().slice(0, 10);
  return createHmac("sha256", secret)
    .update(`visitor|${day}|${ip}|${userAgent ?? ""}`)
    .digest("base64url");
}

export async function recordPageView(view: {
  profileId: string;
  referrer: string | null;
  country: string | null;
  visitorHash: string;
}) {
  const { error } = await createAdminClient()
    .from("page_views")
    .upsert(
      {
        profile_id: view.profileId,
        referrer: view.referrer,
        country: view.country,
        visitor_hash: view.visitorHash,
      },
      { onConflict: "profile_id,visitor_hash", ignoreDuplicates: true },
    );
  if (error) console.error("[analytics] failed to record page view:", error.message);
}

export async function recordLinkClick(click: {
  linkId: string;
  profileId: string;
  referrer: string | null;
  visitorHash: string;
}) {
  const { error } = await createAdminClient()
    .from("link_clicks")
    .upsert(
      {
        link_id: click.linkId,
        profile_id: click.profileId,
        referrer: click.referrer,
        visitor_hash: click.visitorHash,
      },
      { onConflict: "link_id,visitor_hash", ignoreDuplicates: true },
    );
  if (error) console.error("[analytics] failed to record link click:", error.message);
}
