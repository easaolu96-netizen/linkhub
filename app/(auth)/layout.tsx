import { Check } from "lucide-react";
import { Logo } from "@/components/logo";

const BENEFITS = ["Free to start, ready in a minute", "A live preview as you edit", "Analytics without the noise"];

/** Three interlocked links: a static echo of the landing page's 3D hero. */
function ChainMotif() {
  return (
    <svg viewBox="0 0 320 150" className="h-auto w-full max-w-[19rem]" aria-hidden>
      <g fill="none" strokeWidth="15" strokeLinecap="round">
        <rect x="14" y="44" width="118" height="64" rx="32" transform="rotate(-14 73 76)" stroke="var(--paper)" />
        <rect x="102" y="40" width="118" height="64" rx="32" transform="rotate(9 161 72)" stroke="#9fd3b8" />
        <rect x="190" y="46" width="118" height="64" rx="32" transform="rotate(-7 249 78)" stroke="var(--paper)" strokeOpacity="0.45" />
      </g>
    </svg>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center px-5 sm:px-8">
        <Logo />
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-[minmax(0,1fr)] gap-16 px-5 pt-6 pb-20 sm:px-8 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-20">
        <main id="main" tabIndex={-1} className="flex justify-center lg:justify-start">
          <div className="fade-up w-full max-w-[400px]" style={{ "--delay": "0.05s" } as React.CSSProperties}>
            {children}
          </div>
        </main>

        {/* Brand panel: wide screens only, decorative and informational. */}
        <aside
          aria-label="About LinkHub"
          className="fade-up sticky top-8 hidden flex-col justify-between gap-12 rounded-3xl bg-ink p-10 text-paper lg:flex lg:min-h-[34rem]"
          style={{ "--delay": "0.2s" } as React.CSSProperties}
        >
          <ChainMotif />
          <div>
            <p className="font-display text-5xl leading-[0.98] tracking-[-0.02em]">
              One calm page for everything you <em className="text-[#9fd3b8]">make.</em>
            </p>
            <ul className="mt-8 flex flex-col gap-3 text-[15px] text-paper/80">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2.5">
                  <Check className="size-4 shrink-0 text-[#9fd3b8]" aria-hidden />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
