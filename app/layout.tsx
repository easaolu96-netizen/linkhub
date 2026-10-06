import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Playfair_Display, Poppins, Space_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Profile theme fonts (Appearance tab). Not preloaded: the browser only
// downloads a font when a page actually uses it.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], preload: false });
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], preload: false });
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "LinkHub — One link for everything you are",
    template: "%s · LinkHub",
  },
  description:
    "Create a beautiful link-in-bio page in minutes. Share all your links, socials and content from one simple URL.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fontVariables = [geistSans, geistMono, inter, poppins, playfair, spaceMono]
    .map((font) => font.variable)
    .join(" ");

  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
        >
          Skip to content
        </a>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
