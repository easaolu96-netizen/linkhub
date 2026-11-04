import { Fragment, Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AnalyticsShowcase } from "@/components/landing/analytics-showcase";
import { ClaimForm } from "@/components/landing/claim-form";
import { DeletedNotice } from "@/components/landing/deleted-notice";
import { HeroStage } from "@/components/landing/hero-stage";
import { Reveal } from "@/components/landing/reveal";
import { SiteHeader } from "@/components/landing/site-header";
import { StepsSection } from "@/components/landing/steps-section";
import { ThemeSwitcher } from "@/components/landing/theme-switcher";
import { Logo } from "@/components/logo";
import { SITE_URL } from "@/lib/env";
import { LANDING_SECTIONS } from "@/lib/landing-sections";

const HOST = new URL(SITE_URL).host;
const container = "mx-auto w-full max-w-6xl px-5 sm:px-8";
const sectionTitle = "font-display text-[2.75rem] leading-[0.98] tracking-[-0.02em] sm:text-6xl";

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

      <SiteHeader />

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
                Put every link you share on one page, give it your look, and see which links people actually open.
              </p>
              <div className="fade-up mt-7 sm:mt-9" style={{ "--delay": "0.7s" } as React.CSSProperties}>
                <ClaimForm host={HOST} />
              </div>
            </div>
          }
          story={
            <div className="max-w-md">
              <h2 className="font-display text-[2.75rem] leading-[0.98] tracking-[-0.02em] sm:text-6xl">
                Your shop, your work and your socials, on one page.
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-soft sm:text-lg">
                One address in your bio. Visitors see your links in the order you choose, and you can change them any time.
              </p>
            </div>
          }
        />

        <StepsSection host={HOST} />

        <section id="themes" aria-labelledby="themes-heading" className="scroll-mt-16 border-t bg-surface">
          <div className={`${container} py-24 lg:py-32`}>
            <Reveal>
              <ThemeSwitcher
                heading={
                  <h2 id="themes-heading" className={`max-w-xl ${sectionTitle}`}>
                    Eight themes. Click one.
                  </h2>
                }
              />
            </Reveal>
          </div>
        </section>

        <section id="analytics" aria-labelledby="analytics-heading" className="scroll-mt-16 border-t">
          <div className={`${container} grid grid-cols-[minmax(0,1fr)] gap-14 py-24 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-20 lg:py-32`}>
            <Reveal>
              <h2 id="analytics-heading" className={sectionTitle}>
                See what people actually tap.
              </h2>
              <p className="mt-6 max-w-md text-[17px] leading-relaxed text-muted-foreground sm:text-lg">
                Views, clicks and click-through rate for the last week or month. Each visitor counts once a day, and bots and
                your own visits are left out.
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
                Check it now. If it&apos;s taken, try a variation with a dash or underscore.
              </p>
            </Reveal>
            <Reveal delay={0.1} className="rounded-2xl bg-paper p-5 text-ink sm:p-6">
              <ClaimForm host={HOST} id="claim-end" />
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className={`${container} flex flex-col gap-8 py-12 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex items-baseline gap-4">
            <Logo />
            <span className="text-sm text-muted-foreground">© {new Date().getFullYear()}</span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted-foreground">
            {LANDING_SECTIONS.map((s) => (
              <a key={s.href} href={s.href} className="hover:text-ink">
                {s.label}
              </a>
            ))}
            <Link href="/login" className="hover:text-ink">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-ink">
              Sign up
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
