import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;
const supabaseHost = supabaseUrl?.hostname ?? "*.supabase.co";
const supabaseOrigin = supabaseUrl?.origin ?? "https://*.supabase.co";
const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy.
 * - Scripts/styles: same-origin only. Next.js still needs 'unsafe-inline' for
 *   its inline hydration scripts unless every page is rendered dynamically with
 *   a per-request nonce (documented trade-off in SECURITY-AUDIT.md).
 * - Network: only this site and the Supabase project (auth + storage uploads).
 * - Images: this site, Supabase Storage avatars, Google profile photos.
 * - No plugins, no framing, no foreign form targets, no <base> hijacking.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseOrigin} https://lh3.googleusercontent.com`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin}${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
  "media-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Force HTTPS for two years (also covers subdomains of the deployment host).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Legacy frame protection for older browsers (CSP frame-ancestors is the modern one).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send only the origin to the sites users click through to.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  // Isolate our window from cross-origin pages that open us (tab-nabbing, XS-leaks).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework (X-Powered-By: Next.js).
  poweredByHeader: false,
  images: {
    remotePatterns: [
      // Avatars uploaded to Supabase Storage
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/avatars/**" },
      // Google profile photos (from Google sign-in)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
