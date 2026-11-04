"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/landing/reveal";
import { usePrefersReducedMotion } from "@/lib/motion";

const STATS = [
  { label: "Views", value: 2184, format: (n: number) => Math.round(n).toLocaleString("en-US") },
  { label: "Clicks", value: 818, format: (n: number) => Math.round(n).toLocaleString("en-US") },
  { label: "Click-through", value: 37, format: (n: number) => `${Math.round(n)}%` },
];
const LINKS = [
  { title: "Shop the autumn collection", clicks: 412 },
  { title: "Book a wheel-throwing class", clicks: 268 },
  { title: "Studio journal", clicks: 97 },
  { title: "Commissions", clicks: 41 },
];

/** Counts from 0 to `value` once the element is on screen (instant with reduced motion). */
function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [shown, setShown] = useState(value); // server HTML shows the real number

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion || el.getBoundingClientRect().top < window.innerHeight) {
      setShown(value);
      return;
    }
    setShown(0);
    let frame = 0;
    const observer = new IntersectionObserver((entries) => {
      // See Reveal: batched or skipped-past entries still count as seen.
      if (!entries.some((e) => e.isIntersecting || e.boundingClientRect.bottom < 0)) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 1400);
        setShown(value * (1 - Math.pow(1 - t, 3)));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { rootMargin: "100000px 0px 0px 0px" });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, reducedMotion]);

  return (
    <span ref={ref} className="tabular-nums">
      {format(shown)}
    </span>
  );
}

export function AnalyticsShowcase() {
  const max = Math.max(...LINKS.map((l) => l.clicks));
  return (
    <Reveal as="figure" className="rounded-3xl border bg-surface p-6 shadow-[0_40px_80px_-56px_rgba(27,26,23,0.5)] sm:p-9">
      <figcaption className="flex items-baseline justify-between gap-4 text-sm">
        <span className="font-medium">Last 30 days</span>
        <span className="text-muted-foreground">Example data</span>
      </figcaption>
      <dl className="mt-6 grid grid-cols-3 gap-4 border-b pb-7">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <dt className="text-sm text-muted-foreground">{stat.label}</dt>
            <dd className="mt-1 text-[1.65rem] font-semibold tracking-tight sm:text-4xl">
              <CountUp value={stat.value} format={stat.format} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-7 mb-4 text-sm font-medium">Clicks per link</p>
      <ol className="flex flex-col gap-3.5" aria-label="Clicks per link, most clicked first">
        {LINKS.map((link, i) => (
          <li key={link.title} className="grid grid-cols-[minmax(0,1fr)] gap-1.5 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:items-center sm:gap-4">
            <span className="truncate text-sm">{link.title}</span>
            <span className="flex items-center gap-2">
              <span className="relative h-5 flex-1">
                <span
                  aria-hidden
                  className="grow-bar absolute inset-y-0 left-0 rounded-r-[4px] bg-green"
                  style={{ width: `${(link.clicks / max) * 100}%`, "--bar-i": i } as React.CSSProperties}
                />
              </span>
              <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums">
                {link.clicks}
                <span className="sr-only"> clicks</span>
              </span>
            </span>
          </li>
        ))}
      </ol>
    </Reveal>
  );
}
