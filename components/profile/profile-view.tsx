import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { SocialIcon } from "@/components/profile/social-icon";
import { SOCIAL_KEYS, SOCIAL_PLATFORMS, type SocialKey } from "@/lib/socials";
import { cn } from "@/lib/utils";
import { FONT_FAMILIES, themeBackground, type Theme } from "@/lib/theme";
import type { ProfileData, ProfileLink } from "@/lib/types";
import { isSafeHref } from "@/lib/validation/link";

type Mode = "public" | "preview";

const BUTTON_SHAPE: Record<Theme["buttonStyle"], string> = {
  filled: "rounded-md",
  outline: "rounded-md border-2 bg-transparent",
  rounded: "rounded-2xl",
  pill: "rounded-full",
  shadow: "rounded-lg border-2",
};

function buttonStyle(theme: Theme): CSSProperties {
  switch (theme.buttonStyle) {
    case "outline":
      return { borderColor: theme.buttonColor, color: theme.buttonColor };
    case "shadow":
      return {
        backgroundColor: theme.buttonColor,
        color: theme.buttonTextColor,
        borderColor: theme.textColor,
        boxShadow: `4px 4px 0 0 ${theme.textColor}`,
      };
    default:
      return { backgroundColor: theme.buttonColor, color: theme.buttonTextColor };
  }
}

function initials(name: string) {
  return name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * The themed profile page. Rendered server-side on /[username] and inside the
 * dashboard's live preview, so both always look identical.
 */
export function ProfileView({
  profile,
  links,
  mode,
}: {
  profile: ProfileData;
  links: ProfileLink[];
  mode: Mode;
}) {
  const { theme } = profile;
  const name = profile.display_name?.trim() || `@${profile.username}`;
  const isPublic = mode === "public";
  const socialEntries = SOCIAL_KEYS.flatMap((key): [SocialKey, string][] => {
    const url = profile.socials[key];
    return url && isSafeHref(url) ? [[key, url]] : [];
  });

  const buttonClass = cn(
    "flex min-h-14 w-full items-center justify-center px-5 py-3 text-center text-[15px] font-medium leading-snug break-words transition-transform duration-150",
    isPublic &&
      "hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2",
    BUTTON_SHAPE[theme.buttonStyle],
  );

  return (
    <div
      className="flex min-h-full w-full flex-1 flex-col items-center px-5 pt-12 pb-8"
      style={{
        background: themeBackground(theme),
        color: theme.textColor,
        fontFamily: FONT_FAMILIES[theme.font],
      }}
    >
      <div className="flex w-full max-w-[580px] flex-1 flex-col items-center">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt=""
            width={96}
            height={96}
            priority={isPublic}
            // Avatars are already small 512px WebP files on a CDN, so skip the
            // optimizer hop (faster, and no image-optimization quota used).
            unoptimized
            className="size-24 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="flex size-24 items-center justify-center rounded-full text-3xl font-semibold"
            style={{ backgroundColor: theme.buttonColor, color: theme.buttonTextColor }}
          >
            {initials(profile.display_name || profile.username)}
          </div>
        )}

        <h1 className="mt-4 text-center text-xl font-bold break-words">{name}</h1>
        {profile.bio && (
          <p className="mt-2 max-w-md text-center text-[15px] leading-relaxed whitespace-pre-line break-words opacity-85">
            {profile.bio}
          </p>
        )}

        {socialEntries.length > 0 && (
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-1" aria-label="Social profiles">
            {socialEntries.map(([key, url]) => {
              const label = `${SOCIAL_PLATFORMS[key].label}${key === "email" ? "" : ` — ${name}`}`;
              return (
                <li key={key}>
                  {isPublic ? (
                    <a
                      href={url}
                      target={key === "email" ? undefined : "_blank"}
                      rel="noopener noreferrer me"
                      aria-label={label}
                      title={SOCIAL_PLATFORMS[key].label}
                      className="flex size-10 items-center justify-center rounded-full transition-opacity hover:opacity-70 focus-visible:outline-2"
                      style={{ outlineColor: theme.textColor }}
                    >
                      <SocialIcon platform={key} className="size-[22px]" />
                    </a>
                  ) : (
                    <span className="flex size-10 items-center justify-center" title={SOCIAL_PLATFORMS[key].label}>
                      <SocialIcon platform={key} className="size-[22px]" />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <ul className="mt-8 flex w-full flex-col gap-3.5">
          {links.map((link) => (
            <li key={link.id}>
              {isPublic && isSafeHref(link.url) ? (
                <a
                  href={`/api/click/${link.id}`}
                  rel="noopener nofollow"
                  className={buttonClass}
                  style={{ ...buttonStyle(theme), outlineColor: theme.textColor }}
                >
                  {link.title}
                </a>
              ) : (
                <div className={buttonClass} style={buttonStyle(theme)}>
                  {link.title}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <footer className="mt-12 text-xs font-medium opacity-70">
        {isPublic ? (
          <Link href="/" className="underline-offset-4 hover:underline">
            Made with LinkHub
          </Link>
        ) : (
          <span>Made with LinkHub</span>
        )}
      </footer>
    </div>
  );
}
