import { EyeOff } from "lucide-react";
import type { LinkStat } from "@/lib/analytics-data";

/**
 * Clicks per link as horizontal bars (single series → the brand green, no legend).
 * Plain HTML: the value sits at the bar tip, so nothing depends on hover.
 */
export function LinkClicks({ links }: { links: LinkStat[] }) {
  if (links.length === 0) {
    return <p className="text-sm text-muted-foreground">You don&apos;t have any links yet.</p>;
  }
  const max = Math.max(1, ...links.map((l) => l.clicks));

  return (
    <ol className="flex flex-col gap-3" aria-label="Clicks per link, most clicked first">
      {links.map((link) => (
        <li key={link.id} className="grid grid-cols-[minmax(0,1fr)] gap-1.5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-center sm:gap-4">
          <span className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="truncate" title={link.title}>{link.title}</span>
            {!link.isVisible && (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <EyeOff className="size-3" aria-hidden />
                hidden
              </span>
            )}
          </span>
          <span className="flex items-center gap-2">
            <span className="relative h-5 flex-1">
              {link.clicks > 0 && (
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 rounded-r-[4px]"
                  style={{ width: `${Math.max(1.5, (link.clicks / max) * 100)}%`, backgroundColor: "var(--green)" }}
                />
              )}
            </span>
            <span className="w-14 shrink-0 text-right text-sm font-medium tabular-nums">
              {link.clicks.toLocaleString()}
              <span className="sr-only"> {link.clicks === 1 ? "click" : "clicks"}</span>
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
