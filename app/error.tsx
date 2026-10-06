"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown when a page throws (e.g. the database is unreachable). */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" tabIndex={-1} className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div>
        <h1 className="font-display text-5xl leading-none tracking-[-0.01em]">Something went wrong</h1>
        <p className="mt-4 max-w-sm text-muted-foreground">
          Sorry about that. Please try again — if it keeps happening, come back in a few minutes.
        </p>
        {error.digest && <p className="mt-2 text-xs text-muted-foreground">Reference: {error.digest}</p>}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/">Go home</Link>
        </Button>
        <Button onClick={reset}>
          <RotateCcw aria-hidden />
          Try again
        </Button>
      </div>
    </main>
  );
}
