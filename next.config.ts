import type { NextConfig } from "next";

// The Content-Security-Policy is set per request in proxy.ts (it needs a
// fresh nonce each time); see lib/security/csp.ts. API routes and static
// files don't render HTML, so they only get the headers below.

const securityHeaders = [
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
  // No remote images may go through the image optimizer (/_next/image).
  // Avatars are rendered with `unoptimized`, so the browser loads them straight
  // from Supabase Storage / Google. Allowing remote hosts here would let anyone
  // use our optimizer as a proxy for arbitrary images on those hosts.
  images: {
    remotePatterns: [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
