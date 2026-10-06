"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ColorField } from "@/components/dashboard/appearance/color-field";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { Section } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { saveTheme } from "@/lib/actions/theme";
import { AA_CONTRAST, contrastRatio } from "@/lib/color";
import {
  BUTTON_STYLE_LABELS,
  BUTTON_STYLES,
  FONT_FAMILIES,
  FONT_LABELS,
  FONTS,
  presetTheme,
  THEME_PRESETS,
  themeBackground,
  type PresetKey,
  type Theme,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const PRESET_KEYS = Object.keys(THEME_PRESETS) as PresetKey[];

function sameTheme(a: Theme, b: Theme) {
  return (Object.keys(a) as (keyof Theme)[]).every((key) => a[key] === b[key]);
}

/** Single-choice group of toggle buttons (Tab between options, Enter/Space to pick). */
function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
  renderOption,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  renderOption: (option: T, selected: boolean) => React.ReactNode;
}) {
  return (
    <div role="group" aria-label={label} className={className}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option)}
            className={cn(
              "rounded-xl border-2 bg-surface text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              selected ? "border-ink" : "border-transparent ring-1 ring-border hover:ring-ink/30",
            )}
          >
            {renderOption(option, selected)}
          </button>
        );
      })}
    </div>
  );
}

export function AppearanceEditor() {
  const { profile, setProfile } = useDashboard();
  const theme = profile.theme;
  const [saved, setSaved] = useState(theme);
  const [isPending, startTransition] = useTransition();
  const isDirty = !sameTheme(theme, saved);

  // Leaving the tab without saving? Put the preview back to the saved theme.
  const savedRef = useRef(saved);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);
  useEffect(() => {
    return () => setProfile((p) => ({ ...p, theme: savedRef.current }));
  }, [setProfile]);

  function update(changes: Partial<Theme>) {
    setProfile((p) => ({ ...p, theme: { ...p.theme, ...changes, preset: "custom" } }));
  }

  function applyPreset(key: PresetKey) {
    setProfile((p) => ({ ...p, theme: presetTheme(key) }));
  }

  function save() {
    startTransition(async () => {
      const result = await saveTheme(theme);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved(result.data);
      toast.success(result.message ?? "Appearance saved");
    });
  }

  // Accessibility: warn when text would be hard to read.
  const backgrounds =
    theme.backgroundType === "gradient" ? [theme.background, theme.backgroundTo] : [theme.background];
  const textContrast = Math.min(...backgrounds.map((bg) => contrastRatio(theme.textColor, bg)));
  const buttonContrast =
    theme.buttonStyle === "outline"
      ? Math.min(...backgrounds.map((bg) => contrastRatio(theme.buttonColor, bg)))
      : contrastRatio(theme.buttonTextColor, theme.buttonColor);
  const warnings = [
    textContrast < AA_CONTRAST && "Your text colour is hard to read on this background.",
    buttonContrast < AA_CONTRAST &&
      (theme.buttonStyle === "outline"
        ? "Outline buttons are hard to see on this background."
        : "Button text is hard to read on this button colour."),
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col">
      <Section id="themes-heading" title="Themes">
        <ChoiceGroup
          label="Theme presets"
          options={PRESET_KEYS}
          value={theme.preset as PresetKey}
          onChange={applyPreset}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          renderOption={(key, selected) => {
            const preset = presetTheme(key);
            return (
              <span className="flex flex-col gap-2 p-1.5">
                <span
                  className="relative flex aspect-[4/5] flex-col items-center justify-center gap-1.5 rounded-lg px-3"
                  style={{ background: themeBackground(preset) }}
                  aria-hidden
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-3.5 w-full",
                        preset.buttonStyle === "pill" ? "rounded-full" : "rounded-[4px]",
                        preset.buttonStyle === "outline" && "border-[1.5px]",
                      )}
                      style={
                        preset.buttonStyle === "outline"
                          ? { borderColor: preset.buttonColor }
                          : {
                              backgroundColor: preset.buttonColor,
                              boxShadow: preset.buttonStyle === "shadow" ? `2px 2px 0 ${preset.textColor}` : undefined,
                            }
                      }
                    />
                  ))}
                  {selected && (
                    <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                      <Check className="size-3" />
                    </span>
                  )}
                </span>
                <span className="px-1 text-sm font-medium">{THEME_PRESETS[key].label}</span>
              </span>
            );
          }}
        />
        {theme.preset === "custom" && (
          <p className="mt-3 text-sm text-muted-foreground">Using custom settings. Pick a theme to start over.</p>
        )}
      </Section>

      <Section id="background-heading" title="Background">
        <ChoiceGroup
          label="Background type"
          options={["solid", "gradient"] as const}
          value={theme.backgroundType}
          onChange={(backgroundType) => update({ backgroundType })}
          className="mb-4 inline-flex gap-2"
          renderOption={(type) => (
            <span className="block px-4 py-1.5 text-sm font-medium capitalize">{type}</span>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField
            id="bg-color"
            label={theme.backgroundType === "gradient" ? "Gradient start" : "Background colour"}
            value={theme.background}
            onChange={(background) => update({ background })}
          />
          {theme.backgroundType === "gradient" && (
            <ColorField
              id="bg-color-to"
              label="Gradient end"
              value={theme.backgroundTo}
              onChange={(backgroundTo) => update({ backgroundTo })}
            />
          )}
          <ColorField
            id="text-color"
            label="Text colour"
            value={theme.textColor}
            onChange={(textColor) => update({ textColor })}
          />
        </div>
      </Section>

      <Section id="buttons-heading" title="Buttons">
        <ChoiceGroup
          label="Button style"
          options={BUTTON_STYLES}
          value={theme.buttonStyle}
          onChange={(buttonStyle) => update({ buttonStyle })}
          className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5"
          renderOption={(style) => (
            <span className="flex flex-col items-center gap-2 p-3">
              <span
                aria-hidden
                className={cn(
                  "h-7 w-full border-2 border-transparent",
                  style === "filled" && "rounded-sm bg-foreground",
                  style === "outline" && "rounded-sm border-foreground",
                  style === "rounded" && "rounded-lg bg-foreground",
                  style === "pill" && "rounded-full bg-foreground",
                  style === "shadow" && "rounded-md border-foreground bg-background shadow-[3px_3px_0_0_currentColor]",
                )}
              />
              <span className="text-xs font-medium">{BUTTON_STYLE_LABELS[style]}</span>
            </span>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField
            id="button-color"
            label="Button colour"
            value={theme.buttonColor}
            onChange={(buttonColor) => update({ buttonColor })}
          />
          {theme.buttonStyle !== "outline" && (
            <ColorField
              id="button-text-color"
              label="Button text colour"
              value={theme.buttonTextColor}
              onChange={(buttonTextColor) => update({ buttonTextColor })}
            />
          )}
        </div>
      </Section>

      <Section id="font-heading" title="Font">
        <ChoiceGroup
          label="Font"
          options={FONTS}
          value={theme.font}
          onChange={(font) => update({ font })}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          renderOption={(font) => (
            <span className="flex flex-col gap-1 p-3">
              <span className="text-2xl" style={{ fontFamily: FONT_FAMILIES[font] }} aria-hidden>
                Aa
              </span>
              <span className="text-xs font-medium">{FONT_LABELS[font]}</span>
            </span>
          )}
        />
      </Section>

      {warnings.length > 0 && (
        <div
          role="status"
          className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Low contrast</p>
            <ul className="mt-1 list-disc pl-4">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={!isDirty || isPending}
          onClick={() => setProfile((p) => ({ ...p, theme: saved }))}
        >
          <RotateCcw aria-hidden />
          Discard changes
        </Button>
        <Button type="button" size="lg" disabled={!isDirty || isPending} onClick={save}>
          {isPending && <Spinner />}
          {isDirty ? "Save appearance" : "Saved"}
        </Button>
      </div>
    </div>
  );
}
