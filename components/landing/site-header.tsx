"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { LANDING_SECTIONS } from "@/lib/landing-sections";
import { cn } from "@/lib/utils";

/** Landing header: transparent over the hero, solid once the page scrolls. */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color] duration-300",
        scrolled ? "border-border bg-paper" : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-5 sm:h-[4.5rem] sm:px-8">
        <Logo />
        <nav aria-label="Sections" className="hidden items-center gap-8 text-[15px] text-ink-soft md:flex">
          {LANDING_SECTIONS.map((s) => (
            <a key={s.href} href={s.href} className="rounded-sm transition-colors outline-none hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/25">
              {s.label}
            </a>
          ))}
        </nav>
        <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

