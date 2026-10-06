import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function ProfileNotFound() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center px-5 sm:px-8">
        <Logo />
      </header>
      <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 pb-24 sm:px-8">
        <p className="text-sm text-muted-foreground">Nobody here yet</p>
        <h1 className="mt-3 max-w-2xl font-display text-5xl leading-[1.02] tracking-[-0.01em] sm:text-7xl">
          This name is still <em className="text-green">available</em>.
        </h1>
        <p className="mt-5 max-w-md text-lg text-muted-foreground">
          No one has claimed this page. It could be yours in under a minute.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Claim your link</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
