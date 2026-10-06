"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Links" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/appearance", label: "Appearance" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="-mb-px flex gap-6 overflow-x-auto [scrollbar-width:none] sm:gap-8">
      {TABS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-[1.5px] py-3 text-[15px] outline-none transition-colors focus-visible:text-foreground focus-visible:underline",
              active
                ? "border-ink font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
