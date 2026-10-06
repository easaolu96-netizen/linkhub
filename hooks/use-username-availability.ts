"use client";

import { useEffect, useMemo, useState } from "react";
import {
  checkUsernameAvailability,
  type UsernameAvailability,
} from "@/lib/actions/username";
import { usernameSchema } from "@/lib/validation/username";

export type AvailabilityState =
  | { status: "idle" }
  | { status: "checking" }
  | UsernameAvailability;

/**
 * Debounced live availability check. Format is validated locally (instantly);
 * only well-formed names hit the server, and stale responses are ignored.
 */
export function useUsernameAvailability(username: string, delay = 400): AvailabilityState {
  const [remote, setRemote] = useState<UsernameAvailability | null>(null);
  const localError = useMemo(() => {
    if (!username) return null;
    const result = usernameSchema.safeParse(username);
    return result.success ? null : (result.error.issues[0]?.message ?? "Invalid username");
  }, [username]);

  const shouldCheck = Boolean(username) && localError === null;

  useEffect(() => {
    if (!shouldCheck) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      let result: UsernameAvailability;
      try {
        result = await checkUsernameAvailability(username);
      } catch {
        result = { status: "invalid", username, message: "Couldn't check right now" };
      }
      if (!cancelled) setRemote(result);
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, shouldCheck, delay]);

  if (!username) return { status: "idle" };
  if (localError) return { status: "invalid", username, message: localError };
  if (remote?.username === username) return remote;
  return { status: "checking" };
}
