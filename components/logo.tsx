import Link from "next/link";
import { cn } from "@/lib/utils";

/** Typographic wordmark: "linkhub." set in the display serif, full stop in the accent. */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      aria-label="LinkHub home"
      className={cn(
        "inline-flex items-baseline rounded-sm font-display text-[1.65rem] leading-none tracking-[-0.01em] text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/25",
        className,
      )}
    >
      linkhub<span className="text-green">.</span>
    </Link>
  );
}
