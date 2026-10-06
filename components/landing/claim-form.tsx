"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useUsernameAvailability } from "@/hooks/use-username-availability";
import { normalizeUsernameInput, USERNAME_MAX } from "@/lib/validation/username";
import { cn } from "@/lib/utils";

/** "Claim your link" box: live availability check, then on to sign-up. */
export function ClaimForm({ host, id = "claim" }: { host: string; id?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const availability = useUsernameAvailability(username);
  const problem = availability.status === "invalid" || availability.status === "taken";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (availability.status !== "available") return;
    setSubmitting(true);
    router.push(`/signup?username=${encodeURIComponent(username)}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="w-full max-w-xl">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div
          className={cn(
            "flex h-13 w-full items-center rounded-full border sm:flex-1 bg-background pr-4 pl-5 text-base shadow-sm transition-[box-shadow,border-color] focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/30",
            problem && "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
          )}
        >
          <label htmlFor={id} className="shrink-0 cursor-text text-muted-foreground select-none">
            {host}/
          </label>
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
            className="h-full min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground/70"
          />
          <span aria-hidden className="shrink-0">
            {availability.status === "checking" && <Spinner className="text-muted-foreground" />}
            {availability.status === "available" && <CheckCircle2 className="size-5 text-emerald-600" />}
            {problem && <XCircle className="size-5 text-destructive" />}
          </span>
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-13 rounded-full px-6 text-base"
          disabled={submitting || (username !== "" && availability.status !== "available")}
          onClick={(e) => {
            // Empty box: just send people to sign-up.
            if (!username) {
              e.preventDefault();
              router.push("/signup");
            }
          }}
        >
          {submitting ? <Spinner /> : null}
          Claim your link
          {!submitting && <ArrowRight aria-hidden />}
        </Button>
      </div>
      <p
        id={`${id}-status`}
        aria-live="polite"
        className={cn(
          "mt-2 min-h-5 px-5 text-sm",
          problem ? "text-destructive" : "text-muted-foreground",
          availability.status === "available" && "text-emerald-700",
        )}
      >
        {availability.status === "available" && `${host}/${username} is available — it's yours if you want it!`}
        {availability.status === "checking" && "Checking…"}
        {problem && availability.message}
      </p>
    </form>
  );
}
