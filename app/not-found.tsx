import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

/** Two chain links pulled apart: the hero's motif, broken. */
function BrokenLink() {
  return (
    <svg viewBox="0 0 220 120" className="h-auto w-48 sm:w-56" aria-hidden>
      <g fill="none" strokeWidth="14" strokeLinecap="round">
        <rect x="10" y="30" width="96" height="56" rx="28" transform="rotate(-12 58 58)" stroke="var(--ink)" />
        <rect x="122" y="40" width="96" height="56" rx="28" transform="rotate(10 170 68)" stroke="var(--green)" />
      </g>
    </svg>
  );
}

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center px-5 sm:px-8">
        <Logo />
      </header>
      <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 pb-24 sm:px-8">
        <BrokenLink />
        <p className="mt-10 text-sm text-muted-foreground">404</p>
        <h1 className="mt-3 max-w-2xl font-display text-5xl leading-[1.02] tracking-[-0.02em] sm:text-7xl">
          This link has come loose.
        </h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
          The page may have moved, or the address has a typo. Looking for someone&apos;s page? Check the spelling of their
          username.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/signup">Claim a name</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
