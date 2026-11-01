"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { resendEmailCode, verifyEmailCode } from "@/app/auth/actions";
import { CAPTCHA_ENABLED, Turnstile } from "@/components/auth/turnstile";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const RESEND_COOLDOWN = 60;

/** "Enter the code we emailed you" step shown after sign-up (or an unconfirmed login). */
export function EmailCodeStep({
  email,
  codeSent,
  next,
  onBack,
}: {
  email: string;
  /** False after an unconfirmed login: no new code was sent, so resend is offered right away. */
  codeSent: boolean;
  next?: string;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(codeSent ? RESEND_COOLDOWN : 0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [isVerifying, startVerifying] = useTransition();
  const [isResending, startResending] = useTransition();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length < 6) {
      setError("Enter the code from the email.");
      return;
    }
    setError(null);
    startVerifying(async () => {
      // On success the action redirects (to onboarding / the dashboard).
      const result = await verifyEmailCode({ email, code }, next);
      if (result && !result.ok) setError(result.error);
    });
  }

  function onResend() {
    if (CAPTCHA_ENABLED && !captchaToken) {
      toast.error("Please wait a moment for the security check to finish.");
      return;
    }
    const token = captchaToken ?? undefined;
    startResending(async () => {
      const result = await resendEmailCode(email, token);
      setCaptchaKey((k) => k + 1); // single-use token
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "New code sent");
      setCode("");
      setError(null);
      setCooldown(RESEND_COOLDOWN);
    });
  }

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h2 className="font-display text-3xl leading-none">Check your email</h2>
        <p className="mt-3 text-muted-foreground" role="status">
          {codeSent ? "We sent a code to " : "Confirm "}
          <span className="font-medium break-all text-foreground">{email}</span>
          {codeSent
            ? ". Enter it below to confirm your account."
            : " before logging in. Enter the code from your sign-up email, or send yourself a new one below."}
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="email-code">Confirmation code</FieldLabel>
          <Input
            id="email-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="123456"
            maxLength={10}
            aria-invalid={Boolean(error)}
            aria-describedby="email-code-help"
            className="h-12 text-center font-mono text-2xl tracking-[0.4em] placeholder:tracking-[0.4em]"
          />
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldDescription id="email-code-help">
              Can&apos;t find it? Check your spam or promotions folder.
            </FieldDescription>
          )}
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={isVerifying}>
          {isVerifying && <Spinner />}
          Verify and continue
        </Button>
      </form>

      <div className="flex flex-col gap-3 border-t pt-4">
        {/* Only needed (and only shown) once a resend is possible. */}
        {cooldown <= 0 && <Turnstile key={captchaKey} action="resend" onToken={setCaptchaToken} />}
        <div className="flex items-center justify-between gap-2 text-sm">
          <Button variant="link" size="sm" className="px-0" onClick={onResend} disabled={cooldown > 0 || isResending}>
            {isResending && <Spinner />}
            {cooldown > 0 ? `Resend code in ${cooldown}s` : codeSent ? "Resend code" : "Send a new code"}
          </Button>
          <Button variant="link" size="sm" className="px-0 text-muted-foreground" onClick={onBack}>
            Use a different email
          </Button>
        </div>
      </div>
    </div>
  );
}
