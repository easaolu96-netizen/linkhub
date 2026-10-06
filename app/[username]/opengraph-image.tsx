import { ImageResponse } from "next/og";
import { safeAvatarUrl } from "@/lib/avatar";
import { SITE_URL } from "@/lib/env";
import { getPublicProfile } from "@/lib/public-profile";
import { themeBackground } from "@/lib/theme";

export const alt = "LinkHub profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The OG renderer only understands PNG/JPEG, so fetch the avatar ourselves and
 * embed it as a data URL; anything else (e.g. WebP) falls back to initials.
 */
const MAX_AVATAR_BYTES = 1024 * 1024;

async function loadAvatar(src: string | null, ownerId: string) {
  // SSRF guard: only fetch our own storage or Google photos, never follow
  // redirects, and cap the size.
  const url = safeAvatarUrl(src, ownerId);
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: { Accept: "image/png,image/jpeg" },
      redirect: "error",
      signal: AbortSignal.timeout(3000),
    });
    const type = res.headers.get("content-type")?.split(";")[0];
    if (!res.ok || (type !== "image/png" && type !== "image/jpeg")) return null;
    if (Number(res.headers.get("content-length") ?? 0) > MAX_AVATAR_BYTES) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX_AVATAR_BYTES) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Social share card (Open Graph / X) drawn in the user's own theme. */
export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const data = await getPublicProfile(decodeURIComponent(username).toLowerCase());
  const host = new URL(SITE_URL).host;

  if (!data) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#111827", color: "#fff", fontSize: 64, fontWeight: 700 }}>
          LinkHub
        </div>
      ),
      size,
    );
  }

  const { profile, links } = data;
  const { theme } = profile;
  const name = profile.display_name?.trim() || `@${profile.username}`;
  const initials = (profile.display_name || profile.username).slice(0, 1).toUpperCase();
  const avatar = await loadAvatar(profile.avatar_url, profile.id);
  const bio = profile.bio && profile.bio.length > 120 ? `${profile.bio.slice(0, 117)}…` : profile.bio;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: themeBackground(theme),
          color: theme.textColor,
          padding: "64px 80px",
          alignItems: "center",
          gap: 64,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 20 }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
            <img src={avatar} width={168} height={168} style={{ borderRadius: 999, objectFit: "cover" }} alt="" />
          ) : (
            <div
              style={{
                display: "flex",
                width: 168,
                height: 168,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                fontSize: 80,
                fontWeight: 700,
                background: theme.buttonColor,
                color: theme.buttonTextColor,
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
          {bio && <div style={{ display: "flex", fontSize: 30, opacity: 0.85, lineHeight: 1.35 }}>{bio}</div>}
          <div style={{ display: "flex", fontSize: 28, opacity: 0.7, marginTop: 8 }}>
            {host}/{profile.username}
          </div>
        </div>

        {links.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", width: 400, gap: 18 }}>
            {links.slice(0, 4).map((link) => (
              <div
                key={link.id}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "22px 24px",
                  fontSize: 26,
                  fontWeight: 600,
                  borderRadius: theme.buttonStyle === "pill" ? 999 : theme.buttonStyle === "rounded" ? 24 : 10,
                  ...(theme.buttonStyle === "outline"
                    ? { border: `3px solid ${theme.buttonColor}`, color: theme.buttonColor }
                    : { background: theme.buttonColor, color: theme.buttonTextColor }),
                  ...(theme.buttonStyle === "shadow"
                    ? { border: `3px solid ${theme.textColor}`, boxShadow: `6px 6px 0 0 ${theme.textColor}` }
                    : {}),
                }}
              >
                {link.title.length > 28 ? `${link.title.slice(0, 27)}…` : link.title}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    size,
  );
}
