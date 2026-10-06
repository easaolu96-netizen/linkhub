"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { AvailabilityState } from "@/hooks/use-username-availability";
import { normalizeUsernameInput, USERNAME_MAX } from "@/lib/validation/username";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  availability: AvailabilityState;
  /** Shown before the input, e.g. "linkhub.app/". */
  prefix: string;
  autoFocus?: boolean;
};

/** Username input with a URL prefix and a live availability indicator. */
export function UsernameField({ id, value, onChange, availability, prefix, autoFocus }: Props) {
  const statusId = `${id}-status`;
  const invalid = availability.status === "invalid" || availability.status === "taken";

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "flex h-12 items-center overflow-hidden rounded-xl border border-input bg-surface text-base transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20",
          invalid && "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
        )}
      >
        <span className="hidden shrink-0 select-none pl-3 text-muted-foreground sm:inline" aria-hidden>
          {prefix}
        </span>
        <span className="shrink-0 select-none pl-3 text-muted-foreground sm:hidden" aria-hidden>
          @
        </span>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(normalizeUsernameInput(e.target.value))}
          maxLength={USERNAME_MAX}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          placeholder="yourname"
          aria-invalid={invalid}
          aria-describedby={statusId}
          className="h-full min-w-0 flex-1 bg-transparent pr-2 outline-none placeholder:text-muted-foreground"
        />
        <span className="pr-3" aria-hidden>
          {availability.status === "checking" && <Spinner className="text-muted-foreground" />}
          {(availability.status === "available" || availability.status === "current") && (
            <CheckCircle2 className="size-4 text-emerald-600" />
          )}
          {invalid && <XCircle className="size-4 text-destructive" />}
        </span>
      </div>
      <p
        id={statusId}
        aria-live="polite"
        className={cn(
          "min-h-5 text-sm",
          invalid ? "text-destructive" : "text-muted-foreground",
          availability.status === "available" && "text-emerald-700 dark:text-emerald-400",
        )}
      >
        {availability.status === "idle" && "3–30 characters: letters, numbers, _ and -"}
        {availability.status === "checking" && "Checking availability…"}
        {availability.status === "available" && `@${availability.username} is available!`}
        {availability.status === "current" && "This is your current username"}
        {invalid && availability.message}
      </p>
    </div>
  );
}
