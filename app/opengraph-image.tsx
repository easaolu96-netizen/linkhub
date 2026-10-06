import { ImageResponse } from "next/og";
import { displayFonts } from "@/lib/og-fonts";

export const alt = "LinkHub — one link for everything you make";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share card for the landing page, in the brand's editorial style. */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 88px",
          background: "#f6f4ef",
          color: "#1b1a17",
          fontFamily: "Instrument Serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 48 }}>
          linkhub<span style={{ color: "#1e5b47" }}>.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 124, lineHeight: 0.98, letterSpacing: -2 }}>
          <span>One link for everything</span>
          <span style={{ display: "flex" }}>
            you&nbsp;<span style={{ fontStyle: "italic", color: "#1e5b47" }}>make</span>.
          </span>
        </div>
      </div>
    ),
    { ...size, fonts: await displayFonts() },
  );
}
