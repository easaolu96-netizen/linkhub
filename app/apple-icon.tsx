import { ImageResponse } from "next/og";
import { displayFonts } from "@/lib/og-fonts";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iOS: "lh." from the wordmark, on ink. */
export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#1b1a17",
          color: "#f6f4ef",
          fontFamily: "Instrument Serif",
          fontSize: 112,
          lineHeight: 1,
          paddingBottom: 14,
        }}
      >
        lh<span style={{ color: "#5fa98a" }}>.</span>
      </div>
    ),
    { ...size, fonts: await displayFonts() },
  );
}
