import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="flex flex-1 flex-col items-center justify-center gap-6 bg-muted/40 px-6 py-16 text-center">
      <Logo />
      <span className="flex size-14 items-center justify-center rounded-full bg-background shadow-sm">
        <Compass className="size-7 text-muted-foreground" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">We couldn&apos;t find that page</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">
          The link may be broken, or the page may have moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
