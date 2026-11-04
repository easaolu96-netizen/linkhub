"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/**
 * True when the visitor asked their OS for less motion. Animations must then
 * be skipped or replaced by simple fades. Server render assumes motion is OK;
 * CSS `prefers-reduced-motion` rules cover the first paint.
 */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** WebGL support check (some locked-down or very old browsers have none). */
export function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** A rough device tier, so weaker phones and laptops start on the light 3D preset. */
export function isLowPowerDevice() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const fewCores = (nav.hardwareConcurrency ?? 8) <= 4;
  const lowMemory = (nav.deviceMemory ?? 8) <= 4;
  const smallTouch = window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 768;
  return fewCores || lowMemory || smallTouch;
}
