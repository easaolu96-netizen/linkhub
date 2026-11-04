"use client";

import { useState } from "react";
import { PhoneFrame } from "@/components/profile/phone-frame";
import { ProfileView } from "@/components/profile/profile-view";
import { presetTheme, THEME_PRESETS, type PresetKey } from "@/lib/theme";
import type { ProfileData, ProfileLink } from "@/lib/types";
import { cn } from "@/lib/utils";

const KEYS = Object.keys(THEME_PRESETS) as PresetKey[];

const DEMO: Omit<ProfileData, "theme"> = {
  id: "demo",
  username: "amara",
  display_name: "Amara Okafor",
  bio: "Ceramic artist in Lagos. Small-batch pieces and workshops.",
  avatar_url: null,
  socials: { instagram: "https://instagram.com/x", tiktok: "https://www.tiktok.com/@x", email: "mailto:hello@example.com" },
};
const LINKS: ProfileLink[] = ["Shop the autumn collection", "Book a wheel-throwing class", "Studio journal"].map(
  (title, i) => ({ id: String(i), title, url: "https://example.com" }),
);

/** Lets visitors try every real preset on one demo page. `heading` sits above the chips. */
export function ThemeSwitcher({ heading }: { heading: React.ReactNode }) {
  const [active, setActive] = useState<PresetKey>("forest");

  function onKeyDown(event: React.KeyboardEvent) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = KEYS[(KEYS.indexOf(active) + step + KEYS.length) % KEYS.length];
    setActive(next);
    (event.currentTarget.querySelector(`[data-key="${next}"]`) as HTMLElement | null)?.focus();
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-20">
      <div>
        {heading}
        <div role="radiogroup" aria-label="Example theme" className="mt-10 flex flex-wrap gap-2.5" onKeyDown={onKeyDown}>
          {KEYS.map((key) => {
            const { theme, label } = THEME_PRESETS[key];
            const selected = key === active;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                data-key={key}
                onClick={() => setActive(key)}
                className={cn(
                  "group inline-flex items-center gap-2.5 rounded-full border py-1.5 pr-4 pl-1.5 text-[15px] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                  selected ? "border-ink bg-ink text-paper" : "border-input bg-surface hover:border-ink/40",
                )}
              >
                <span
                  aria-hidden
                  className="size-7 rounded-full border border-black/10"
                  style={{
                    background:
                      theme.backgroundType === "gradient"
                        ? `linear-gradient(135deg, ${theme.background}, ${theme.backgroundTo})`
                        : theme.background,
                    boxShadow: `inset 0 -8px 0 ${theme.buttonColor}`,
                  }}
                />
                {label}
              </button>
            );
          })}
        </div>
        <p className="mt-6 max-w-md text-[17px] leading-relaxed text-muted-foreground">
          Start from one, then change any colour, button or font. If text gets hard to read, the editor tells you.
        </p>
      </div>

      <div className="justify-self-center">
        <PhoneFrame className="w-[268px] shadow-[0_40px_80px_-40px_rgba(27,26,23,0.55)] sm:w-[290px]" scrollable={false} label={`${THEME_PRESETS[active].label} theme example`}>
          {/* Keyed by theme so each switch fades the new look in. */}
          <div key={active} className="h-full animate-in duration-500 fade-in motion-reduce:animate-none">
            <ProfileView profile={{ ...DEMO, theme: presetTheme(active) }} links={LINKS} mode="preview" showFooter={false} />
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}
