import { ImageResponse } from "next/og";

export const alt = "LinkHub — one link for everything you are";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share card for the landing page. */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: "linear-gradient(135deg, #eef2ff 0%, #ffffff 55%, #fdf2f8 100%)",
          color: "#0b0b0b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 44, fontWeight: 700 }}>
          <div
            style={{
              display: "flex",
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#111111",
              color: "#ffffff",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
            }}
          >
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 17H7A5 5 0 0 1 7 7h2" />
              <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
              <line x1="8" x2="16" y1="12" y2="12" />
            </svg>
          </div>
          LinkHub
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 48, fontSize: 84, fontWeight: 800, lineHeight: 1.05 }}>
          <span>Everything you are.</span>
          <span style={{ color: "#4f46e5" }}>One simple link.</span>
        </div>
        <div style={{ display: "flex", marginTop: 32, fontSize: 34, color: "#52514e" }}>
          Your links, socials and content on one beautiful page.
        </div>
      </div>
    ),
    size,
  );
}
