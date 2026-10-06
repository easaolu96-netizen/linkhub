import type { Metadata } from "next";
import Link from "next/link";
import { LinkClicks } from "@/components/dashboard/analytics/link-clicks";
import { TrafficChart } from "@/components/dashboard/analytics/traffic-chart";
import { PageHeader, Section } from "@/components/dashboard/page-header";
import { ANALYTICS_RANGES, getAnalytics, parseRange } from "@/lib/analytics-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export default async function AnalyticsPage({ searchParams }: PageProps<"/dashboard/analytics">) {
  const range = parseRange((await searchParams).range);
  const data = await getAnalytics(range);
  const ctr = data.rangeViews > 0 ? (data.rangeClicks / data.rangeViews) * 100 : null;
  const hasAnyData = data.totalViews > 0 || data.totalClicks > 0;

  const stats = [
    {
      label: "Page views",
      value: compact.format(data.rangeViews),
      detail: `${data.totalViews.toLocaleString()} all time`,
    },
    {
      label: "Link clicks",
      value: compact.format(data.rangeClicks),
      detail: `${data.totalClicks.toLocaleString()} all time`,
    },
    {
      label: "Click-through",
      value: ctr === null ? "—" : `${ctr.toFixed(ctr < 10 ? 1 : 0)}%`,
      detail: "Clicks ÷ views",
    },
  ];

  return (
    <>
      {/* One filter scopes everything below it. */}
      <PageHeader
        title="Analytics"
        description="How people find and use your page."
        actions={
          <nav aria-label="Date range" className="flex gap-5 text-[15px]">
            {ANALYTICS_RANGES.map((days) => (
              <Link
                key={days}
                href={`/dashboard/analytics?range=${days}`}
                scroll={false}
                aria-current={days === range ? "page" : undefined}
                className={cn(
                  "border-b-[1.5px] pb-1 outline-none transition-colors focus-visible:underline",
                  days === range
                    ? "border-ink font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {days} days
              </Link>
            ))}
          </nav>
        }
      />

      <dl className="grid grid-cols-3 divide-x border-y">
        {stats.map((stat) => (
          <div key={stat.label} className="px-4 py-6 first:pl-0 sm:px-6">
            <dt className="text-sm text-muted-foreground">{stat.label}</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{stat.value}</dd>
            <dd className="mt-1 text-xs text-muted-foreground">{stat.detail}</dd>
          </div>
        ))}
      </dl>

      {!hasAnyData && (
        <p className="mt-8 text-muted-foreground">
          <span className="font-medium text-foreground">No visits yet.</span> Share your link in your bio and
          views and clicks will appear here. Your own visits while signed in aren&apos;t counted.
        </p>
      )}

      <div className="mt-12">
        <Section id="traffic-heading" title={`Views and clicks · last ${range} days`}>
          <TrafficChart data={data.daily} />
        </Section>
        <Section id="links-heading" title={`Clicks per link · last ${range} days`}>
          <LinkClicks links={data.links} />
        </Section>
      </div>
    </>
  );
}
