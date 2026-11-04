"use client";

import { useEffect, useRef, useState } from "react";
import { Check, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Pick a username",
    body: "It becomes your page address. Short and easy to say works best.",
  },
  {
    title: "Add your links",
    body: "Paste your links, drag them into order and hide the ones that are out of season. Every change shows in a live preview.",
  },
  {
    title: "Share it",
    body: "Put the address in your bio. Then see how many people visit, what they open and where they came from.",
  },
] as const;

function ClaimSketch({ host }: { host: string }) {
  return (
    <div className="rounded-2xl border border-input bg-surface p-2 shadow-[0_24px_48px_-32px_rgba(27,26,23,0.35)]">
      <div className="flex items-center gap-1 rounded-xl px-3 py-3 text-[15px]">
        <span className="text-muted-foreground">{host}/</span>
        <span className="font-medium text-ink">amara</span>
        <span className="ml-0.5 h-5 w-px animate-pulse bg-ink motion-reduce:animate-none" aria-hidden />
      </div>
      <p className="flex items-center gap-1.5 px-3 pb-2 text-sm text-green">
        <Check className="size-4" aria-hidden /> Available
      </p>
    </div>
  );
}

function LinksSketch() {
  const rows = ["Shop the autumn collection", "Book a wheel-throwing class", "Studio journal"];
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((title, i) => (
        <li
          key={title}
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-surface px-3 py-3 text-[15px]",
            i === 1 && "relative z-10 -rotate-[1.5deg] shadow-[0_18px_36px_-18px_rgba(27,26,23,0.45)] motion-reduce:rotate-0",
          )}
        >
          <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{title}</span>
          <span className={cn("h-5 w-9 shrink-0 rounded-full p-0.5", i === 2 ? "bg-input" : "bg-green")} aria-hidden>
            <span className={cn("block size-4 rounded-full bg-white", i !== 2 && "translate-x-4")} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function ShareSketch({ host }: { host: string }) {
  const bars = [18, 26, 22, 34, 30, 44, 52];
  return (
    <div className="rounded-2xl border bg-surface p-5">
      <p className="text-sm text-muted-foreground">Bio</p>
      <p className="mt-1 text-[15px]">
        Ceramics, Lagos. Shop + classes ↓ <span className="font-medium text-green">{host}/amara</span>
      </p>
      <div className="mt-5 flex items-end justify-between gap-4 border-t pt-4">
        <div>
          <p className="text-sm text-muted-foreground">Clicks this week</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">226</p>
        </div>
        <div className="flex h-14 items-end gap-1.5" aria-hidden>
          {bars.map((h, i) => (
            <span key={i} className="w-2.5 rounded-t-[3px] bg-green" style={{ height: `${h}px`, opacity: 0.45 + i * 0.08 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * "How it works": on wide screens the heading and a large step numeral stay
 * pinned (CSS sticky) while the three steps scroll past; the numeral follows
 * the step in the middle of the screen.
 */
export function StepsSection({ host }: { host: string }) {
  const [active, setActive] = useState(0);
  const panels = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    panels.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const sketches = [<ClaimSketch key="c" host={host} />, <LinksSketch key="l" />, <ShareSketch key="s" host={host} />];

  return (
    <section id="how" aria-labelledby="steps-heading" className="scroll-mt-16 border-t">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16 lg:py-0">
        <div className="lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:justify-center">
          <h2 id="steps-heading" className="max-w-md font-display text-[2.75rem] leading-[0.98] tracking-[-0.02em] sm:text-6xl">
            How it works
          </h2>
          <p className="mt-5 max-w-sm text-[17px] leading-relaxed text-muted-foreground">
            Sign up, add your links, put the address in your bio.
          </p>
          <div className="mt-12 hidden items-end gap-6 lg:flex" aria-hidden>
            <span className="relative block h-[9rem] w-[11rem] overflow-hidden font-display text-[9rem] leading-none text-green">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.2,0.7,0.1,1)] motion-reduce:transition-none",
                    i === active ? "translate-y-0 opacity-100" : i < active ? "-translate-y-full opacity-0" : "translate-y-full opacity-0",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              ))}
            </span>
            <span className="mb-4 flex flex-col gap-2">
              {STEPS.map((step, i) => (
                <span key={step.title} className={cn("flex items-center gap-2 text-sm transition-colors", i === active ? "text-ink" : "text-muted-foreground/70")}>
                  <span className={cn("h-px transition-all duration-500", i === active ? "w-8 bg-green" : "w-4 bg-input")} />
                  {step.title}
                </span>
              ))}
            </span>
          </div>
        </div>

        <ol className="flex flex-col gap-16 lg:gap-0">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              ref={(el) => {
                panels.current[i] = el;
              }}
              data-index={i}
              className="lg:flex lg:min-h-[85svh] lg:flex-col lg:justify-center"
            >
              <span className="font-display text-3xl text-green lg:hidden" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-xl font-medium lg:mt-0 lg:text-2xl">{step.title}</h3>
              <p className="mt-2 max-w-md text-[17px] leading-relaxed text-muted-foreground">{step.body}</p>
              <div className="mt-8 max-w-md">{sketches[i]}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
