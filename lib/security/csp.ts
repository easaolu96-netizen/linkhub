import { SUPABASE_URL } from "@/lib/env";

const supabaseOrigin = new URL(SUPABASE_URL).origin;
const turnstileOrigin = "https://challenges.cloudflare.com";
const isDev = process.env.NODE_ENV !== "production";

/** A fresh, unguessable nonce for one response. */
export function createNonce() {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/**
 * Content-Security-Policy for HTML pages, set per request by proxy.ts.
 * - Scripts: only those carrying this response's nonce (Next.js adds it to
 *   its own scripts automatically) and scripts *they* load ('strict-dynamic',
 *   e.g. Cloudflare Turnstile). No 'unsafe-inline': an injected <script>
 *   without the nonce won't run. Needs dynamic rendering (see app/layout.tsx).
 * - Styles keep 'unsafe-inline' for React `style` attributes (adding a nonce
 *   here would make browsers ignore 'unsafe-inline' and break them).
 * - Network: only this site and the Supabase project (auth + storage uploads).
 * - Images: this site, Supabase Storage avatars, Google profile photos.
 * - Frames: only the Turnstile check. Nobody may frame us; no foreign form
 *   targets, plugins or <base> hijacking.
 */
export function contentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${turnstileOrigin}${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabaseOrigin} https://lh3.googleusercontent.com`,
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseOrigin}${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
    "media-src 'none'",
    "object-src 'none'",
    `frame-src ${turnstileOrigin}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
  ].join("; ");
}
