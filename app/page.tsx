import { Suspense } from "react";
import Link from "next/link";
import { BarChart3, MousePointerClick, Palette } from "lucide-react";
import { ClaimForm } from "@/components/landing/claim-form";
import { DeletedNotice } from "@/components/landing/deleted-notice";
import { Logo } from "@/components/logo";
import { PhoneFrame } from "@/components/profile/phone-frame";
import { ProfileView } from "@/components/profile/profile-view";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/env";
import { presetTheme } from "@/lib/theme";
import type { ProfileData, ProfileLink } from "@/lib/types";

const HOST = new URL(SITE_URL).host;

const DEMO_PROFILE: ProfileData = {
  id: "demo",
  username: "alexrivera",
  display_name: "Alex Rivera",
  bio: "Travel filmmaker 🎥 Sharing gear, guides and stories from 40+ countries.",
  avatar_url: null,
  theme: presetTheme("gradient"),
  socials: {
    instagram: "https://instagram.com/alexrivera",
    youtube: "https://www.youtube.com/@alexrivera",
    tiktok: "https://www.tiktok.com/@alexrivera",
    email: "mailto:hello@example.com",
  },
};

const DEMO_LINKS: ProfileLink[] = [
  { id: "1", title: "▶ Latest video: 30 days in Japan", url: "https://example.com" },
  { id: "2", title: "My camera gear", url: "https://example.com" },
  { id: "3", title: "Free travel planning guide", url: "https://example.com" },
  { id: "4", title: "Work with me", url: "https://example.com" },
];

const FEATURES = [
  {
    icon: MousePointerClick,
    title: "Edit with a live preview",
    body: "Add, reorder and hide links with drag-and-drop. Every change shows up on a phone preview instantly.",
  },
  {
    icon: Palette,
    title: "Make it unmistakably yours",
    body: "Start from a polished theme, then pick your colours, button style and font. Add your socials in seconds.",
  },
  {
    icon: BarChart3,
    title: "See what's working",
    body: "Track page views and link clicks over the last 7 or 30 days, and find out which links people love.",
  },
];

export default function Home() {
  return (
    <>
      <Suspense>
        <DeletedNotice />
      </Suspense>

      <header className="sticky top-0 z-30 border-b border-transparent bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav aria-label="Account" className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link href="/signup">Sign up free</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[36rem] bg-[radial-gradient(ellipse_at_top,rgba(199,210,254,0.55),transparent_60%)]"
          />
          <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:pt-20 lg:pb-28">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <p className="mb-4 rounded-full border bg-background/70 px-3 py-1 text-sm text-muted-foreground">
                Free forever · No credit card
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Everything you are. <span className="text-indigo-600">One simple link.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-pretty text-muted-foreground">
                Put all your content, socials and shops on a single beautiful page. Share it in your
                bio and watch the clicks roll in.
              </p>
              <div className="mt-8 w-full max-w-xl">
                <ClaimForm host={HOST} />
              </div>
            </div>

            <div className="relative mx-auto" aria-label="Example LinkHub page" role="img">
              <div
                aria-hidden
                className="absolute -inset-8 -z-10 rounded-full bg-gradient-to-tr from-indigo-300/40 via-fuchsia-300/30 to-transparent blur-3xl"
              />
              <PhoneFrame className="w-[260px] rotate-2 sm:w-[290px]" scrollable={false}>
                <ProfileView profile={DEMO_PROFILE} links={DEMO_LINKS} mode="preview" />
              </PhoneFrame>
            </div>
          </div>
        </section>

        {/* Features */}
        <section aria-labelledby="features-heading" className="border-t bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 id="features-heading" className="text-center text-3xl font-bold tracking-tight text-balance">
              Built for creators, small businesses and everyone in between
            </h2>
            <ul className="mt-12 grid gap-6 md:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="rounded-2xl border bg-card p-6 shadow-xs">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-muted-foreground">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final call to action */}
        <section aria-labelledby="cta-heading">
          <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center sm:px-6">
            <h2 id="cta-heading" className="text-3xl font-bold tracking-tight text-balance">
              Your link is waiting
            </h2>
            <p className="mt-3 max-w-md text-muted-foreground">
              Claim your username before someone else does. It takes less than a minute.
            </p>
            <div className="mt-8 flex w-full justify-center">
              <ClaimForm host={HOST} id="claim-bottom" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-3">
            <Logo className="text-base text-foreground" />
            <span>© {new Date().getFullYear()}</span>
          </div>
          <nav aria-label="Footer" className="flex gap-5">
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Sign up
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
