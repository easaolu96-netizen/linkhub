import { PageHeader } from "@/components/dashboard/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading analytics">
      <PageHeader title="Analytics" description="How people find and use your page." />
      <Skeleton className="mb-5 h-10 w-64" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className={i === 2 ? "col-span-2 h-28 sm:col-span-1" : "h-28"} />
        ))}
      </div>
      <Skeleton className="mt-6 h-96" />
      <Skeleton className="mt-6 h-48" />
    </div>
  );
}
