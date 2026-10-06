"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useUsernameAvailability } from "@/hooks/use-username-availability";
import { normalizeUsernameInput, USERNAME_MAX } from "@/lib/validation/username";
import { cn } from "@/lib/utils";

/** "Claim your link" control: live availability check, then on to sign-up. */
export function ClaimForm({ host, id = "claim" }: { host: string; id?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const availability = useUsernameAvailability(username);
  const problem = availability.status === "invalid" || availability.status === "taken";
  const blocked = username !== "" && availability.status !== "available";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    setSubmitting(true);
    router.push(username ? `/signup?username=${encodeURIComponent(username)}` : "/signup");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="w-full max-w-xl">
      <div
        className={cn(
          "flex flex-col gap-2 rounded-2xl border border-input bg-surface p-1.5 transition-[border-color,box-shadow] focus-within:border-ink/40 focus-within:shadow-[0_0_0_4px_var(--green-soft)] sm:flex-row sm:items-center",
          problem && "border-destructive/60 focus-within:border-destructive/60",
        )}
      >
        <label htmlFor={id} className="flex min-w-0 flex-1 cursor-text items-center pl-3.5 text-[17px]">
          <span className="shrink-0 text-muted-foreground select-none">{host}/</span>
          <input
            id={id}
            value={username}
            onChange={(e) => setUsername(normalizeUsernameInput(e.target.value))}
            placeholder="yourname"
            maxLength={USERNAME_MAX}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={problem}
            aria-describedby={`${id}-status`}
            className="h-11 min-w-0 flex-1 bg-transparent font-medium text-ink outline-none placeholder:font-normal placeholder:text-muted-foreground/60"
          />
        </label>
        <button
          type="submit"
          disabled={submitting || blocked}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[15px] font-medium text-primary-foreground transition-colors outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50"
        >
          {submitting ? <Spinner /> : null}
          Claim your link
          {!submitting && <ArrowRight className="size-4" aria-hidden />}
        </button>
      </div>
      <p
        id={`${id}-status`}
        aria-live="polite"
        className={cn("mt-2.5 min-h-5 pl-1 text-sm text-muted-foreground", problem && "text-destructive")}
      >
        {availability.status === "idle" && "Free to use. Takes about a minute."}
        {availability.status === "checking" && "Checking…"}
        {availability.status === "available" && (
          <span className="text-green">
            {host}/{username} is available.
          </span>
        )}
        {problem && availability.message}
      </p>
    </form>
  );
}
