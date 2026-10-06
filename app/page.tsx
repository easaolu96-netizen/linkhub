import { Suspense } from "react";
import Link from "next/link";
import { LinkClicks } from "@/components/dashboard/analytics/link-clicks";
import { ClaimForm } from "@/components/landing/claim-form";
import { DeletedNotice } from "@/components/landing/deleted-notice";
import { Logo } from "@/components/logo";
import { PhoneFrame } from "@/components/profile/phone-frame";
import { ProfileView } from "@/components/profile/profile-view";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/env";
import { presetTheme, type PresetKey } from "@/lib/theme";
import type { ProfileData, ProfileLink } from "@/lib/types";

const HOST = new URL(SITE_URL).host;

function demoProfile(
  username: string,
  name: string,
  bio: string,
  preset: PresetKey,
  socials: ProfileData["socials"] = {},
): ProfileData {
  return { id: username, username, display_name: name, bio, avatar_url: null, theme: presetTheme(preset), socials };
}

const links = (...titles: string[]): ProfileLink[] =>
  titles.map((title, i) => ({ id: String(i), title, url: "https://example.com" }));

const HERO = {
  profile: demoProfile(
    "amaraokafor",
    "Amara Okafor",
    "Ceramic artist in Lagos. Small-batch pieces and workshops.",
    "forest",
    {
      instagram: "https://instagram.com/x",
      tiktok: "https://www.tiktok.com/@x",
      email: "mailto:hello@example.com",
    },
  ),
  links: links("Shop the autumn collection", "Book a wheel-throwing class", "Studio journal", "Commissions"),
};

const THEME_SAMPLES = [
  { profile: demoProfile("tunde", "Tunde Bakare", "Producer. New EP out Friday.", "bold"), links: links("Listen on Spotify", "Tour dates", "Merch") },
  { profile: demoProfile("lena", "Lena Hart", "Illustrator & picture-book maker.", "pastel"), links: links("Portfolio", "Prints shop", "Newsletter") },
  { profile: demoProfile("devon", "Devon Lee", "Writing about type and the web.", "minimal"), links: links("Latest essay", "Talks", "Contact") },
  { profile: demoProfile("noor", "Noor Haddad", "Coffee roaster. Ships nationwide.", "dark"), links: links("Order beans", "Brew guides", "Visit the café") },
];

const STEPS = [
  {
    title: "Claim your name",
    body: "Pick a short username. Your page lives at one clean address you can put anywhere.",
  },
  {
    title: "Add what matters",
    body: "Paste your links, drag them into order and hide the ones that are out of season. Every change shows in a live preview.",
  },
  {
    title: "Share and learn",
    body: "Put the link in your bio. See how many people visit, what they tap and where they come from.",
  },
];

const DEMO_STATS = [
  { id: "a", title: "Shop the autumn collection", isVisible: true, clicks: 412 },
  { id: "b", title: "Book a wheel-throwing class", isVisible: true, clicks: 268 },
  { id: "c", title: "Studio journal", isVisible: true, clicks: 97 },
  { id: "d", title: "Commissions", isVisible: true, clicks: 41 },
];

const container = "mx-auto w-full max-w-6xl px-5 sm:px-8";

export default function Home() {
  return (
    <>
      <Suspense>
        <DeletedNotice />
      </Suspense>

      <header className={`${container} flex h-20 items-center justify-between`}>
        <Logo />
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
        {/* Hero */}
        <section className={`${container} grid grid-cols-[minmax(0,1fr)] items-center gap-14 pt-10 pb-24 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-10 lg:pt-16 lg:pb-32`}>
          <div>
            <h1 className="font-display text-[3.25rem] leading-[0.95] tracking-[-0.02em] text-balance sm:text-7xl lg:text-[5.5rem]">
              One link for everything you <em className="text-green">make</em>.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
              A calm, fast page for your bio. Add your links, choose a look, and see what people tap.
            </p>
            <div className="mt-9">
              <ClaimForm host={HOST} />
            </div>
          </div>

          <div className="flex justify-center lg:justify-end" role="img" aria-label="An example LinkHub page">
            <PhoneFrame className="w-[270px] shadow-[0_30px_60px_-30px_rgba(27,26,23,0.45)] sm:w-[290px]" scrollable={false}>
              <ProfileView profile={HERO.profile} links={HERO.links} mode="preview" />
            </PhoneFrame>
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby="steps-heading" className="border-t">
          <div className={`${container} py-20 lg:py-28`}>
            <h2 id="steps-heading" className="max-w-xl font-display text-4xl leading-[1.05] tracking-[-0.01em] sm:text-5xl">
              From sign-up to shareable in three steps.
            </h2>
            <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x">
              {STEPS.map((step, i) => (
                <li key={step.title} className="md:px-8 md:first:pl-0 md:last:pr-0">
                  <span className="font-display text-2xl text-green" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-lg font-medium">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Themes */}
        <section aria-labelledby="themes-heading" className="border-t bg-surface">
          <div className={`${container} py-20 lg:py-28`}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
              <h2 id="themes-heading" className="font-display text-4xl leading-[1.05] tracking-[-0.01em] sm:text-5xl">
                Make it look like you.
              </h2>
              <p className="max-w-md text-lg leading-relaxed text-muted-foreground lg:justify-self-end">
                Start from a considered theme, then adjust colours, buttons and type until it feels right.
              </p>
            </div>
            {/* Scrolls sideways on small screens, so it must be keyboard-focusable. */}
            <ul
              tabIndex={0}
              className="-mx-5 mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 outline-none [scrollbar-width:none] focus-visible:ring-3 focus-visible:ring-ring/25 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0"
              aria-label="Example themes"
            >
              {THEME_SAMPLES.map((sample) => (
                <li key={sample.profile.username} className="shrink-0 snap-center">
                  <PhoneFrame className="w-[230px] border-[8px] lg:w-full xl:w-full" scrollable={false} label={`${sample.profile.display_name} example`}>
                    <ProfileView profile={sample.profile} links={sample.links} mode="preview" />
                  </PhoneFrame>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Analytics */}
        <section aria-labelledby="analytics-heading" className="border-t">
          <div className={`${container} grid grid-cols-[minmax(0,1fr)] gap-14 py-20 lg:grid-cols-2 lg:items-center lg:py-28`}>
            <div>
              <h2 id="analytics-heading" className="font-display text-4xl leading-[1.05] tracking-[-0.01em] sm:text-5xl">
                See what people actually tap.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
                Views, clicks and click-through rate for the last week or month. Bots and your own visits
                are left out, so the numbers mean something.
              </p>
            </div>
            <figure className="rounded-2xl border bg-surface p-6 sm:p-8">
              <dl className="grid grid-cols-3 gap-4 border-b pb-6">
                {[
                  ["Views", "2,184"],
                  ["Clicks", "818"],
                  ["Click-through", "37%"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{value}</dd>
                  </div>
                ))}
              </dl>
              <figcaption className="mt-6 mb-4 text-sm font-medium">Clicks per link · last 30 days</figcaption>
              <LinkClicks links={DEMO_STATS} />
            </figure>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="border-t bg-ink text-paper">
          <div className={`${container} flex flex-col items-start gap-8 py-20 sm:flex-row sm:items-end sm:justify-between lg:py-24`}>
            <h2 className="max-w-2xl font-display text-4xl leading-[1.05] tracking-[-0.01em] sm:text-6xl">
              Your name is probably still free.
            </h2>
            <Button asChild size="lg" className="bg-paper text-ink hover:bg-paper/90">
              <Link href="/signup">Claim your link</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className={`${container} flex flex-col gap-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-baseline gap-4">
          <Logo className="text-xl" />
          <span>© {new Date().getFullYear()}</span>
        </div>
        <nav aria-label="Footer" className="flex gap-6">
          <Link href="/login" className="hover:text-foreground">
            Log in
          </Link>
          <Link href="/signup" className="hover:text-foreground">
            Sign up
          </Link>
        </nav>
      </footer>
    </>
  );
}
