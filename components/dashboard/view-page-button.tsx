"use client";

import { ArrowUpRight } from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-provider";

/** The user's public address, shown in the header as a quiet link. */
export function ViewPageButton({ host }: { host: string }) {
  const { profile } = useDashboard();
  return (
    <a
      href={`/${profile.username}`}
      target="_blank"
      rel="noopener"
      className="group inline-flex max-w-[52vw] items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25"
    >
      <span className="hidden truncate sm:inline">{host}/</span>
      <span className="truncate font-medium text-foreground">{profile.username}</span>
      <ArrowUpRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-px group-hover:-translate-y-px" aria-hidden />
      <span className="sr-only">(opens your public page in a new tab)</span>
    </a>
  );
}
