"use client";

import { useEffect, useRef, useState } from "react";
import { TURNSTILE_SITE_KEY } from "@/lib/env";

// Cloudflare Turnstile ("are you human?" check) for the email auth forms.
// The token it produces is sent to Supabase, which verifies it with Cloudflare
// using the secret key configured in the Supabase dashboard (never in this app).
// Without NEXT_PUBLIC_TURNSTILE_SITE_KEY the widget renders nothing.

export const CAPTCHA_ENABLED = TURNSTILE_SITE_KEY.length > 0;

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "flexible" | "compact";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ): string;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null; // allow a retry on the next mount
      script.remove();
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Tokens are single-use: after each submit, change the widget's `key` so it
 * remounts and produces a fresh token.
 */
export function Turnstile({
  action,
  onToken,
}: {
  /** Shown in the Cloudflare analytics (e.g. "login", "signup"). */
  action: string;
  onToken: (token: string | null) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    if (!CAPTCHA_ENABLED) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(container.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          theme: "light",
          size: "flexible",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
      onTokenRef.current(null);
    };
  }, [action]);

  if (!CAPTCHA_ENABLED) return null;

  if (loadFailed) {
    return (
      <p className="text-sm text-destructive" role="alert">
        The security check couldn&apos;t load. Turn off any content blocker for this site and refresh the page.
      </p>
    );
  }

  // Reserve the widget's height so the form doesn't jump when it appears.
  return <div ref={container} className="min-h-[65px]" />;
}
