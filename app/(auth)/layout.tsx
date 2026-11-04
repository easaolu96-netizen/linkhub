import { Logo } from "@/components/logo";
import { PhoneFrame } from "@/components/profile/phone-frame";
import { ProfileView } from "@/components/profile/profile-view";
import { presetTheme } from "@/lib/theme";
import type { ProfileData, ProfileLink } from "@/lib/types";

const EXAMPLE: ProfileData = {
  id: "example",
  username: "amara",
  display_name: "Amara Okafor",
  bio: "Ceramic artist in Lagos. Small-batch pieces and workshops.",
  avatar_url: null,
  theme: presetTheme("forest"),
  socials: { instagram: "https://instagram.com/x", tiktok: "https://www.tiktok.com/@x", email: "mailto:hello@example.com" },
};
const EXAMPLE_LINKS: ProfileLink[] = ["Shop the autumn collection", "Book a wheel-throwing class", "Studio journal"].map(
  (title, i) => ({ id: String(i), title, url: "https://example.com" }),
);

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center px-5 sm:px-8">
        <Logo />
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-[minmax(0,1fr)] gap-16 px-5 pt-6 pb-20 sm:px-8 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-20">
        <main id="main" tabIndex={-1} className="flex justify-center lg:justify-start">
          {/* No entrance animation here: the form must be usable (and count as
              painted) immediately. Only the decorative panel fades in. */}
          <div className="w-full max-w-[400px]">{children}</div>
        </main>

        {/* Wide screens only: an example page, so new visitors see what they get. */}
        <aside
          aria-label="Example LinkHub page"
          className="fade-up sticky top-8 hidden flex-col items-center gap-6 rounded-2xl bg-ink px-10 pt-12 pb-10 lg:flex"
          style={{ "--delay": "0.2s" } as React.CSSProperties}
        >
          <PhoneFrame className="w-[260px] border-zinc-800 shadow-none" scrollable={false} label="Example page">
            <ProfileView profile={EXAMPLE} links={EXAMPLE_LINKS} mode="preview" showFooter={false} />
          </PhoneFrame>
          <p className="text-sm text-paper/60">An example page, as visitors see it.</p>
        </aside>
      </div>
    </div>
  );
}
