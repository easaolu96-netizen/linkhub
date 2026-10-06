import "server-only";

type HeaderSource = { get(name: string): string | null };

const BOT_PATTERN =
  /bot|crawl|spider|slurp|scrape|fetch|preview|facebookexternalhit|facebookcatalog|embedly|quora link|outbrain|pinterest|vkshare|w3c_validator|whatsapp|telegram|discord|skype|slack|bitlybot|flipboard|tumblr|redditbot|headless|phantomjs|puppeteer|playwright|selenium|lighthouse|pagespeed|gtmetrix|curl|wget|python|httpclient|okhttp|go-http|java\/|axios|node-fetch|undici|postman|insomnia|monitor|uptime|pingdom/i;

/** True for crawlers, link-preview fetchers, monitors and scripts. */
export function isBot(userAgent: string | null) {
  if (!userAgent || userAgent.length < 10) return true;
  return BOT_PATTERN.test(userAgent);
}

/** True when the browser is only prefetching (not a real visit). */
export function isPrefetch(headers: HeaderSource) {
  return (
    headers.get("next-router-prefetch") !== null ||
    headers.get("purpose") === "prefetch" ||
    headers.get("sec-purpose")?.includes("prefetch") === true
  );
}

export function getClientIp(headers: HeaderSource) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}

/** Keep only the referring site's origin (privacy + short values). */
export function getReferrerOrigin(headers: HeaderSource, ownHost?: string | null) {
  const referer = headers.get("referer");
  if (!referer) return null;
  try {
    const url = new URL(referer);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (ownHost && url.host === ownHost) return null; // internal navigation
    return url.origin.slice(0, 200);
  } catch {
    return null;
  }
}

/** Two-letter country code provided by Vercel's edge network (null locally). */
export function getCountry(headers: HeaderSource) {
  const country = headers.get("x-vercel-ip-country");
  return country && /^[A-Z]{2}$/.test(country) ? country : null;
}
