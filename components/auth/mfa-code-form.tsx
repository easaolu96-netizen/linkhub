"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { ActionResult } from "@/lib/action-result";

/** 6-digit authenticator-app code input; `submit` is the server action to call. */
export function MfaCodeForm({
  submit,
  onSuccess,
  submitLabel = "Verify",
  autoFocus = true,
  id = "mfa-code",
}: {
  submit: (code: string) => Promise<ActionResult>;
  onSuccess: (result: Extract<ActionResult, { ok: true }>) => void;
  submitLabel?: string;
  autoFocus?: boolean;
  id?: string;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    startTransition(async () => {
      const result = await submit(code);
      if (!result.ok) {
        setError(result.error);
        setCode("");
        return;
      }
      setError(null);
      onSuccess(result);
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={id}>Authenticator code</FieldLabel>
        <Input
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          placeholder="123456"
          maxLength={6}
          aria-invalid={Boolean(error)}
          className="h-12 text-center font-mono text-2xl tracking-[0.4em] placeholder:tracking-[0.4em]"
        />
        {error ? (
          <FieldError>{error}</FieldError>
        ) : (
          <FieldDescription>Open your authenticator app and enter the current code for LinkHub.</FieldDescription>
        )}
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending && <Spinner />}
        {submitLabel}
      </Button>
    </form>
  );
}
