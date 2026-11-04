import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { after } from "next/server";
import { ProfileView } from "@/components/profile/profile-view";
import { recordPageView, visitorHash } from "@/lib/analytics";
import { getAuthUser } from "@/lib/auth";
import { getPublicProfile } from "@/lib/public-profile";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, getCountry, getReferrerOrigin, isBot, isPrefetch } from "@/lib/request-info";

type Props = PageProps<"/[username]">;

/** The profile for this URL, or null if there is none (redirects /Jane → /jane). */
async function findProfile(params: Props["params"]) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const normalized = decoded.toLowerCase();
  if (!/^[a-z0-9_-]{3,30}$/.test(normalized)) return null;
  // /Jane → /jane (one canonical URL for SEO)
  if (decoded !== normalized) permanentRedirect(`/${normalized}`);
  return getPublicProfile(normalized);
}

async function loadProfile(params: Props["params"]) {
  const data = await findProfile(params);
  if (!data) notFound();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Unknown username: return the 404 title here instead of throwing notFound(),
  // which would discard all metadata and leave the site's default title.
  const data = await findProfile(params);
  if (!data) return { title: "Page not found", robots: { index: false } };
  const { profile } = data;
  const name = profile.display_name?.trim() || profile.username;
  const title = `${name} (@${profile.username})`;
  const description = profile.bio?.trim() || `Check out ${name}'s links on LinkHub.`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/${profile.username}` },
    openGraph: { title, description, type: "profile", url: `/${profile.username}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export async function generateViewport({ params }: Props): Promise<Viewport> {
  const data = await findProfile(params);
  return data ? { themeColor: data.profile.theme.background } : {};
}

export default async function PublicProfilePage({ params }: Props) {
  const { profile, links } = await loadProfile(params);

  // Request headers must be read here; they aren't available inside after()
  // when it's called from a Server Component.
  const h = await headers();
  const userAgent = h.get("user-agent");
  const ip = getClientIp(h);
  // Don't count owners looking at their own page (local JWT check, no network).
  const viewer = await getAuthUser().catch(() => null);
  const shouldTrack =
    viewer?.id !== profile.id &&
    !isBot(userAgent) &&
    !isPrefetch(h) &&
    // Cheap first filter per server instance (the database then keeps at most
    // one view per visitor per profile per day): stops refresh-spam early,
    // and caps 60 views per IP per minute overall.
    rateLimit(`view:${ip}:${profile.id}`, 1, 30_000) &&
    rateLimit(`views:${ip}`, 60, 60_000);

  if (shouldTrack) {
    const referrer = getReferrerOrigin(h, h.get("host"));
    const country = getCountry(h);
    // Runs after the HTML is sent, so tracking never slows the page down.
    const visitor = visitorHash(ip, userAgent);
    after(() => recordPageView({ profileId: profile.id, referrer, country, visitorHash: visitor }));
  }

  return (
    <main id="main" tabIndex={-1} className="flex flex-1 flex-col">
      <ProfileView profile={profile} links={links} mode="public" />
    </main>
  );
}
