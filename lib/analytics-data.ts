import "server-only";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const ANALYTICS_RANGES = [7, 30] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

const count = z.coerce.number().int().nonnegative();

const analyticsSchema = z.object({
  daily: z.array(z.object({ day: z.string(), views: count, clicks: count })),
  links: z.array(z.object({ link_id: z.uuid(), clicks: count })),
  range_views: count,
  range_clicks: count,
  total_views: count,
  total_clicks: count,
});

export type DailyPoint = { day: string; views: number; clicks: number };
export type LinkStat = { id: string; title: string; isVisible: boolean; clicks: number };

export type Analytics = {
  range: AnalyticsRange;
  daily: DailyPoint[];
  links: LinkStat[];
  rangeViews: number;
  rangeClicks: number;
  totalViews: number;
  totalClicks: number;
};

export function parseRange(value: unknown): AnalyticsRange {
  return value === "30" ? 30 : 7;
}

export async function getAnalytics(range: AnalyticsRange): Promise<Analytics> {
  const user = await requireUser();
  const supabase = await createClient();

  const [statsResult, linksResult] = await Promise.all([
    supabase.rpc("get_analytics", { days: range }),
    supabase
      .from("links")
      .select("id, title, is_visible")
      .eq("user_id", user.id)
      .order("position", { ascending: true }),
  ]);

  if (statsResult.error) throw new Error(`Failed to load analytics: ${statsResult.error.message}`);
  if (linksResult.error) throw new Error(`Failed to load links: ${linksResult.error.message}`);

  const stats = analyticsSchema.parse(statsResult.data);
  const clicksByLink = new Map(stats.links.map((l) => [l.link_id, l.clicks]));

  return {
    range,
    daily: stats.daily,
    // Every current link is listed (0 clicks included), most-clicked first.
    links: linksResult.data
      .map((l) => ({ id: l.id, title: l.title, isVisible: l.is_visible, clicks: clicksByLink.get(l.id) ?? 0 }))
      .sort((a, b) => b.clicks - a.clicks),
    rangeViews: stats.range_views,
    rangeClicks: stats.range_clicks,
    totalViews: stats.total_views,
    totalClicks: stats.total_clicks,
  };
}
