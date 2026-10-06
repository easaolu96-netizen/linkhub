import Link from "next/link";
import { SearchX } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function ProfileNotFound() {
  return (
    <main id="main" tabIndex={-1} className="flex flex-1 flex-col items-center justify-center gap-6 bg-muted/40 px-6 py-16 text-center">
      <Logo />
      <span className="flex size-14 items-center justify-center rounded-full bg-background shadow-sm">
        <SearchX className="size-7 text-muted-foreground" aria-hidden />
      </span>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">
          Nobody has claimed this username yet. Want it? It could be yours in under a minute.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Claim your link</Link>
        </Button>
      </div>
    </main>
  );
}
