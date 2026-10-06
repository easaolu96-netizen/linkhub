"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const HEX = /^#[0-9a-f]{6}$/i;

/** Native colour picker + hex text box, kept in sync. */
export function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  // Text can be temporarily invalid while typing; re-sync when value changes elsewhere.
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setText(value);
  }

  function onText(next: string) {
    // Always exactly one leading "#", whether or not the user typed it.
    const normalized = `#${next.replace(/#/g, "")}`;
    setText(normalized);
    if (HEX.test(normalized)) onChange(normalized.toLowerCase());
  }

  const invalid = !HEX.test(text);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          aria-label={`${label} picker`}
          className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
        />
        <Input
          id={id}
          value={text}
          onChange={(e) => onText(e.target.value.trim())}
          onBlur={() => invalid && setText(value)}
          maxLength={7}
          spellCheck={false}
          autoCapitalize="none"
          aria-invalid={invalid}
          className="font-mono uppercase"
        />
      </div>
    </div>
  );
}
