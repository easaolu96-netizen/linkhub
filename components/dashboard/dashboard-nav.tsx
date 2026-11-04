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
              // The underline is a pseudo-element that draws in from the left.
              "relative shrink-0 py-3 text-[15px] outline-none transition-colors focus-visible:text-foreground focus-visible:underline",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-[1.5px] after:origin-left after:bg-ink after:transition-transform after:duration-300 after:ease-out motion-reduce:after:transition-none",
              active
                ? "font-medium text-foreground after:scale-x-100"
                : "text-muted-foreground after:scale-x-0 hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
