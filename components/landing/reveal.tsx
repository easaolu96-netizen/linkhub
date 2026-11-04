"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type State = "static" | "waiting" | "shown";

/**
 * Fades its content up the first time it scrolls into view.
 * Server HTML is fully visible (no JavaScript needed, good for SEO); only
 * content that is still below the fold gets hidden after hydration, so
 * nothing on screen ever flickers. Reduced motion: see .reveal in globals.css.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  /** Seconds, for staggering siblings. */
  delay?: number;
  as?: "div" | "li" | "figure";
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<State>("static");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already visible
    setState("waiting");
    const observer = new IntersectionObserver(
      (entries) => {
        // Fast scrolling can batch "entered" and "left" together, and jumping
        // to an anchor can skip past entirely: either way, it has been seen.
        if (!entries.some((e) => e.isIntersecting || e.boundingClientRect.bottom < 0)) return;
        setState("shown");
        observer.disconnect();
      },
      // The huge top margin makes anything already scrolled past count as
      // "in view", so a jump over the element in one frame still reveals it.
      { rootMargin: "100000px 0px -12% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      data-reveal={state}
      className={cn("reveal", className)}
      style={delay ? ({ "--reveal-delay": `${delay}s` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
