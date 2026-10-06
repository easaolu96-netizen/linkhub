import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Instrument Serif for images rendered with next/og (share cards, app icon).
 * The OG renderer can't use web fonts, so it reads the TTF files from /assets/fonts.
 */
export async function displayFonts() {
  const [regular, italic] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/InstrumentSerif-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/InstrumentSerif-Italic.ttf")),
  ]);
  return [
    { name: "Instrument Serif", data: regular, style: "normal" as const, weight: 400 as const },
    { name: "Instrument Serif", data: italic, style: "italic" as const, weight: 400 as const },
  ];
}
