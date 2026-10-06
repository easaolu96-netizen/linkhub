import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { LinkClicks } from "@/components/dashboard/analytics/link-clicks";
import { TrafficChart } from "@/components/dashboard/analytics/traffic-chart";
import { PageHeader } from "@/components/dashboard/page-header";
import { ANALYTICS_RANGES, getAnalytics, parseRange } from "@/lib/analytics-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: PageProps<"/dashboard/analytics">) {
  const range = parseRange((await searchParams).range);
  const data = await getAnalytics(range);
  const ctr = data.rangeViews > 0 ? (data.rangeClicks / data.rangeViews) * 100 : null;
  const hasAnyData = data.totalViews > 0 || data.totalClicks > 0;

  return (
    <>
      <PageHeader title="Analytics" description="How people find and use your page." />

      {/* One filter row scopes everything below it. */}
      <nav aria-label="Date range" className="mb-5 inline-flex rounded-lg border bg-card p-1">
        {ANALYTICS_RANGES.map((days) => (
          <Link
            key={days}
            href={`/dashboard/analytics?range=${days}`}
            scroll={false}
            aria-current={days === range ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              days === range ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Last {days} days
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          label="Page views"
          value={compact.format(data.rangeViews)}
          detail={`${data.totalViews.toLocaleString()} all time`}
        />
        <StatTile
          label="Link clicks"
          value={compact.format(data.rangeClicks)}
          detail={`${data.totalClicks.toLocaleString()} all time`}
        />
        <div className="col-span-2 sm:col-span-1">
          <StatTile
            label="Click-through rate"
            value={ctr === null ? "—" : `${ctr.toFixed(ctr < 10 ? 1 : 0)}%`}
            detail="Clicks ÷ views"
          />
        </div>
      </div>

      {!hasAnyData && (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-dashed bg-card px-6 py-10 text-center">
          <BarChart3 className="size-8 text-muted-foreground" aria-hidden />
          <h2 className="font-semibold">No visits yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Share your page link in your bio — views and clicks will show up here. Your own visits
            while signed in aren&apos;t counted.
          </p>
        </div>
      )}

      <section aria-labelledby="traffic-heading" className="mt-6 rounded-2xl border bg-card p-5 sm:p-6">
        <h2 id="traffic-heading" className="mb-4 font-semibold">
          Views &amp; clicks · last {range} days
        </h2>
        <TrafficChart data={data.daily} />
      </section>

      <section aria-labelledby="links-heading" className="mt-6 rounded-2xl border bg-card p-5 sm:p-6">
        <h2 id="links-heading" className="mb-4 font-semibold">
          Clicks per link · last {range} days
        </h2>
        <LinkClicks links={data.links} />
      </section>
    </>
  );
}
