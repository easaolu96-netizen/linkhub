import { Fragment, Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AnalyticsShowcase } from "@/components/landing/analytics-showcase";
import { ClaimForm } from "@/components/landing/claim-form";
import { DeletedNotice } from "@/components/landing/deleted-notice";
import { HeroStage } from "@/components/landing/hero-stage";
import { Reveal } from "@/components/landing/reveal";
import { StepsSection } from "@/components/landing/steps-section";
import { ThemeSwitcher } from "@/components/landing/theme-switcher";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/env";

const HOST = new URL(SITE_URL).host;
const container = "mx-auto w-full max-w-6xl px-5 sm:px-8";
const eyebrow = "text-sm font-medium tracking-[0.14em] text-green uppercase";
const sectionTitle = "font-display text-[2.6rem] leading-[1] tracking-[-0.02em] sm:text-6xl";

const SECTIONS = [
  { href: "#how", label: "How it works" },
  { href: "#themes", label: "Themes" },
  { href: "#analytics", label: "Analytics" },
];

export const metadata: Metadata = { alternates: { canonical: "/" } };

/** Headline words, each revealed from a mask (see .rise-word in globals.css). */
function RiseWords({ text, offset = 0 }: { text: string; offset?: number }) {
  // The space sits between the masks: inside an inline-block it would collapse.
  return text.split(" ").map((word, i) => (
    <Fragment key={i}>
      <span className="rise-word">
        <span style={{ "--i": i + offset } as React.CSSProperties}>{word}</span>
      </span>{" "}
    </Fragment>
  ));
}

export default function Home() {
  return (
    <>
      <Suspense>
        <DeletedNotice />
      </Suspense>

      {/* Floats over the hero stage so the 3D scene can use the full screen. */}
      <header className={`${container} absolute inset-x-0 top-0 z-20 flex h-20 items-center justify-between gap-6`}>
        <Logo />
        <nav aria-label="Sections" className="hidden items-center gap-7 text-[15px] text-ink-soft md:flex">
          {SECTIONS.map((s) => (
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
      </header>

      <main id="main" tabIndex={-1} className="flex-1">
        <HeroStage
          intro={
            <div className="max-w-xl">
              <h1
                id="hero-heading"
                className="font-display text-[3.1rem] leading-[0.92] tracking-[-0.025em] text-balance sm:text-7xl lg:text-[6.25rem]"
              >
                <RiseWords text="One link for everything you" />
                <span className="rise-word">
                  <em className="text-green" style={{ "--i": 5 } as React.CSSProperties}>
                    make.
                  </em>
                </span>
              </h1>
              <p className="fade-up mt-5 max-w-md text-[17px] leading-relaxed text-ink-soft sm:mt-6 sm:text-lg" style={{ "--delay": "0.55s" } as React.CSSProperties}>
                A calm, fast page for your bio. Add your links, choose a look, and see what people tap.
              </p>
              <div className="fade-up mt-7 sm:mt-9" style={{ "--delay": "0.7s" } as React.CSSProperties}>
                <ClaimForm host={HOST} />
              </div>
            </div>
          }
          story={
            <div className="max-w-md">
              <p className={eyebrow}>From scattered to sorted</p>
              <h2 className="mt-4 font-display text-[2.6rem] leading-[0.98] tracking-[-0.02em] sm:text-6xl">
                Every link you share, in one calm place.
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-soft sm:text-lg">
                Your shop, your work, your socials. One address in your bio, and everything lined up in the order you choose.
              </p>
            </div>
          }
        />

        <StepsSection host={HOST} />

        <section id="themes" aria-labelledby="themes-heading" className="scroll-mt-4 border-t bg-surface">
          <div className={`${container} py-24 lg:py-32`}>
            <Reveal>
              <ThemeSwitcher
                heading={
                  <>
                    <p className={eyebrow}>Themes</p>
                    <h2 id="themes-heading" className={`mt-4 max-w-xl ${sectionTitle}`}>
                      Make it look like you. Try one.
                    </h2>
                  </>
                }
              />
            </Reveal>
          </div>
        </section>

        <section id="analytics" aria-labelledby="analytics-heading" className="scroll-mt-4 border-t">
          <div className={`${container} grid grid-cols-[minmax(0,1fr)] gap-14 py-24 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-20 lg:py-32`}>
            <Reveal>
              <p className={eyebrow}>Analytics</p>
              <h2 id="analytics-heading" className={`mt-4 ${sectionTitle}`}>
                See what people actually tap.
              </h2>
              <p className="mt-6 max-w-md text-[17px] leading-relaxed text-muted-foreground sm:text-lg">
                Views, clicks and click-through rate for the last week or month. Each visitor counts once a day, and bots and
                your own visits are left out, so the numbers mean something.
              </p>
            </Reveal>
            <AnalyticsShowcase />
          </div>
        </section>

        <section aria-labelledby="cta-heading" className="bg-ink text-paper">
          <div className={`${container} grid grid-cols-[minmax(0,1fr)] gap-12 py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:py-32`}>
            <Reveal>
              <h2 id="cta-heading" className="font-display text-[2.9rem] leading-[0.95] tracking-[-0.02em] sm:text-7xl">
                Your name is probably still <em className="text-[#9fd3b8]">free.</em>
              </h2>
              <p className="mt-6 max-w-md text-[17px] leading-relaxed text-paper/70 sm:text-lg">
                Pick a name, add your first links and share your page today.
              </p>
            </Reveal>
            <Reveal delay={0.1} className="rounded-3xl bg-paper p-5 text-ink sm:p-7">
              <ClaimForm host={HOST} id="claim-end" />
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className={`${container} grid grid-cols-[minmax(0,1fr)] gap-10 py-14 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-16`}>
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">One calm page for everything you make.</p>
          </div>
          <nav aria-label="Footer: product" className="flex flex-col gap-2.5 text-sm">
            <span className="font-medium">Product</span>
            {SECTIONS.map((s) => (
              <a key={s.href} href={s.href} className="text-muted-foreground hover:text-ink">
                {s.label}
              </a>
            ))}
          </nav>
          <nav aria-label="Footer: account" className="flex flex-col gap-2.5 text-sm">
            <span className="font-medium">Account</span>
            <Link href="/signup" className="text-muted-foreground hover:text-ink">
              Sign up
            </Link>
            <Link href="/login" className="text-muted-foreground hover:text-ink">
              Log in
            </Link>
          </nav>
        </div>
        <div className={`${container} border-t py-6 text-sm text-muted-foreground`}>© {new Date().getFullYear()} LinkHub</div>
      </footer>
    </>
  );
}
