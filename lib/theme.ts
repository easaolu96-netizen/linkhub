import { z } from "zod";
import type { Json } from "@/lib/supabase/database.types";

export const BUTTON_STYLES = ["filled", "outline", "rounded", "pill", "shadow"] as const;
export const FONTS = ["inter", "poppins", "playfair", "space-mono"] as const;
export const BACKGROUND_TYPES = ["solid", "gradient"] as const;

export type ButtonStyle = (typeof BUTTON_STYLES)[number];
export type FontKey = (typeof FONTS)[number];

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "Use a hex colour like #1a2b3c");

export const DEFAULT_THEME = {
  preset: "light",
  backgroundType: "solid",
  background: "#ffffff",
  backgroundTo: "#e5e7eb",
  textColor: "#111827",
  buttonStyle: "rounded",
  buttonColor: "#111827",
  buttonTextColor: "#ffffff",
  font: "inter",
} as const satisfies Record<string, string>;

/** Strict schema used to validate what users save. */
export const themeSchema = z.object({
  preset: z.string().trim().max(30),
  backgroundType: z.enum(BACKGROUND_TYPES),
  background: hex,
  backgroundTo: hex,
  textColor: hex,
  buttonStyle: z.enum(BUTTON_STYLES),
  buttonColor: hex,
  buttonTextColor: hex,
  font: z.enum(FONTS),
});

export type Theme = z.infer<typeof themeSchema>;

/** Lenient parser for stored JSON: any missing/invalid field falls back to the default. */
const storedThemeSchema = z.object({
  preset: themeSchema.shape.preset.catch(DEFAULT_THEME.preset),
  backgroundType: themeSchema.shape.backgroundType.catch(DEFAULT_THEME.backgroundType),
  background: hex.catch(DEFAULT_THEME.background),
  backgroundTo: hex.catch(DEFAULT_THEME.backgroundTo),
  textColor: hex.catch(DEFAULT_THEME.textColor),
  buttonStyle: themeSchema.shape.buttonStyle.catch(DEFAULT_THEME.buttonStyle),
  buttonColor: hex.catch(DEFAULT_THEME.buttonColor),
  buttonTextColor: hex.catch(DEFAULT_THEME.buttonTextColor),
  font: themeSchema.shape.font.catch(DEFAULT_THEME.font),
});

export function parseTheme(value: Json | null | undefined): Theme {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return storedThemeSchema.parse(input);
}

/** CSS font stacks. The --font-* variables are defined by next/font in app/layout.tsx. */
export const FONT_FAMILIES: Record<FontKey, string> = {
  inter: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  poppins: "var(--font-poppins), ui-sans-serif, system-ui, sans-serif",
  playfair: "var(--font-playfair), ui-serif, Georgia, serif",
  "space-mono": "var(--font-space-mono), ui-monospace, monospace",
};

export function themeBackground(theme: Theme) {
  return theme.backgroundType === "gradient"
    ? `linear-gradient(160deg, ${theme.background}, ${theme.backgroundTo})`
    : theme.background;
}

export const FONT_LABELS: Record<FontKey, string> = {
  inter: "Inter",
  poppins: "Poppins",
  playfair: "Playfair Display",
  "space-mono": "Space Mono",
};

export const BUTTON_STYLE_LABELS: Record<ButtonStyle, string> = {
  filled: "Filled",
  outline: "Outline",
  rounded: "Rounded",
  pill: "Pill",
  shadow: "Hard shadow",
};

type PresetTheme = Omit<Theme, "preset">;

/** Ready-made looks. Every preset meets WCAG AA contrast for text and buttons. */
export const THEME_PRESETS = {
  light: {
    label: "Light",
    theme: {
      backgroundType: "solid",
      background: "#ffffff",
      backgroundTo: "#e5e7eb",
      textColor: "#111827",
      buttonStyle: "rounded",
      buttonColor: "#111827",
      buttonTextColor: "#ffffff",
      font: "inter",
    },
  },
  dark: {
    label: "Dark",
    theme: {
      backgroundType: "solid",
      background: "#0b0b0f",
      backgroundTo: "#1f1f27",
      textColor: "#f4f4f5",
      buttonStyle: "rounded",
      buttonColor: "#27272a",
      buttonTextColor: "#fafafa",
      font: "inter",
    },
  },
  gradient: {
    label: "Gradient",
    theme: {
      backgroundType: "gradient",
      background: "#4f46e5",
      backgroundTo: "#db2777",
      textColor: "#ffffff",
      buttonStyle: "pill",
      buttonColor: "#ffffff",
      buttonTextColor: "#3730a3",
      font: "poppins",
    },
  },
  minimal: {
    label: "Minimal",
    theme: {
      backgroundType: "solid",
      background: "#fafaf9",
      backgroundTo: "#e7e5e4",
      textColor: "#1c1917",
      buttonStyle: "outline",
      buttonColor: "#1c1917",
      buttonTextColor: "#fafaf9",
      font: "space-mono",
    },
  },
  bold: {
    label: "Bold",
    theme: {
      backgroundType: "solid",
      background: "#facc15",
      backgroundTo: "#f97316",
      textColor: "#111111",
      buttonStyle: "shadow",
      buttonColor: "#ffffff",
      buttonTextColor: "#111111",
      font: "poppins",
    },
  },
  pastel: {
    label: "Pastel",
    theme: {
      backgroundType: "gradient",
      background: "#fce7f3",
      backgroundTo: "#dbeafe",
      textColor: "#3b0764",
      buttonStyle: "pill",
      buttonColor: "#ffffff",
      buttonTextColor: "#6b21a8",
      font: "poppins",
    },
  },
  forest: {
    label: "Forest",
    theme: {
      backgroundType: "solid",
      background: "#14532d",
      backgroundTo: "#052e16",
      textColor: "#f0fdf4",
      buttonStyle: "rounded",
      buttonColor: "#f0fdf4",
      buttonTextColor: "#14532d",
      font: "playfair",
    },
  },
  elegant: {
    label: "Elegant",
    theme: {
      backgroundType: "solid",
      background: "#f5f0e8",
      backgroundTo: "#e7dcc8",
      textColor: "#3f2d20",
      buttonStyle: "filled",
      buttonColor: "#3f2d20",
      buttonTextColor: "#f5f0e8",
      font: "playfair",
    },
  },
} satisfies Record<string, { label: string; theme: PresetTheme }>;

export type PresetKey = keyof typeof THEME_PRESETS;

export function presetTheme(key: PresetKey): Theme {
  const { theme } = THEME_PRESETS[key];
  return { ...theme, preset: key };
}
