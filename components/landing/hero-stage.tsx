"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { hasWebGL, isLowPowerDevice, usePrefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Quality, SceneInput } from "./three/interlinked-scene";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// three.js is only downloaded in the browser, after the page is on screen.
const InterlinkedScene = dynamic(() => import("./three/interlinked-scene"), { ssr: false });

type Mode = "pending" | "3d" | "static";

/**
 * The landing hero: a tall section whose viewport-sized "stage" stays pinned
 * while you scroll. Scroll progress unlinks the 3D ring of chain links into a
 * stack (one page of links) while the copy changes from `intro` to `story`.
 */
export function HeroStage({ intro, story }: { intro: React.ReactNode; story: React.ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const input = useRef<SceneInput>({ progress: 0, pointer: { x: 0, y: 0 } });
  const reducedMotion = usePrefersReducedMotion();
  const [mode, setMode] = useState<Mode>("pending");
  const [quality, setQuality] = useState<Quality>("high");
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  // Decide once in the browser: real 3D, or the static fallback.
  // Waits for the headline fonts and then for an idle moment, so downloading
  // and starting three.js never competes with showing the headline.
  useEffect(() => {
    let cancelled = false;
    let cancelIdle = () => {};
    const start = () => {
      if (cancelled) return;
      if (isLowPowerDevice()) setQuality("low");
      setMode(hasWebGL() ? "3d" : "static");
    };
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      if ("requestIdleCallback" in window) {
        const id = window.requestIdleCallback(start, { timeout: 2500 });
        cancelIdle = () => window.cancelIdleCallback(id);
      } else {
        const id = setTimeout(start, 400);
        cancelIdle = () => clearTimeout(id);
      }
    });
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, []);

  // Stop rendering when the hero is scrolled away or the tab is hidden.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(el);
    const onVisibility = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Pointer position for the gentle tilt (mouse and pen only, not touch scrolling).
  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      input.current.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      input.current.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion]);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const scrub = { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.8 };
      // Scroll position → scene progress (smoothed by the scrub).
      gsap.to(input.current, { progress: 1, ease: "none", scrollTrigger: scrub });
      gsap
        .timeline({ scrollTrigger: scrub })
        .to(introRef.current, { autoAlpha: 0, y: -48, ease: "power1.in", duration: 0.22 }, 0.08)
        .fromTo(
          storyRef.current,
          { autoAlpha: 0, y: 56 },
          { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.25 },
          0.4,
        )
        // Hold the final state until the stage unpins. Timeline length = 1, so
        // the positions above are fractions of the scroll.
        .to({}, { duration: 0.35 });
    },
    { scope: root, dependencies: [reducedMotion] },
  );

  // Layout switches with CSS `motion-reduce:` variants (not JS), so it is right
  // from the first paint: pinned scroll story normally; a still, one-screen
  // hero followed by the story as plain content when motion is reduced.
  return (
    <section ref={root} aria-labelledby="hero-heading" className="relative h-[250svh] motion-reduce:h-auto">
      <div className="sticky top-0 h-svh overflow-hidden motion-reduce:relative">
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 transition-opacity duration-1000",
            mode === "3d" ? "opacity-100" : "opacity-0",
          )}
        >
          {mode === "3d" && (
            <InterlinkedScene
              input={input}
              active={onScreen && tabVisible}
              still={reducedMotion}
              quality={quality}
              onQualityChange={setQuality}
            />
          )}
        </div>

        <div className="relative mx-auto h-full w-full max-w-6xl px-5 sm:px-8">
          <div
            ref={introRef}
            className="flex h-full flex-col justify-end pb-[max(2.5rem,env(safe-area-inset-bottom))] md:justify-center md:pb-0"
          >
            {intro}
          </div>
          <div
            ref={storyRef}
            className="invisible absolute inset-x-5 top-24 opacity-0 sm:inset-x-8 md:top-1/2 md:-translate-y-1/2 motion-reduce:hidden"
          >
            {story}
          </div>
        </div>
      </div>

      {/* Reduced motion: the story is ordinary content under the hero. */}
      <div className="mx-auto hidden w-full max-w-6xl px-5 py-20 sm:px-8 motion-reduce:block">{story}</div>
    </section>
  );
}
