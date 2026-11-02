"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { requestPasswordReset, setNewPassword, verifyResetCode } from "@/app/auth/actions";
import { MfaCodeForm } from "@/components/auth/mfa-code-form";
import { CAPTCHA_ENABLED, Turnstile } from "@/components/auth/turnstile";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { verifyMfa } from "@/lib/actions/mfa";
import { setPasswordSchema, type SetPasswordInput } from "@/lib/validation/auth";

type Step = { name: "email" } | { name: "code"; email: string } | { name: "mfa" } | { name: "password" };

/** Forgot password: email → code from the email → (2FA code) → new password. */
export function ResetPasswordFlow() {
  const [step, setStep] = useState<Step>({ name: "email" });

  if (step.name === "code") {
    return (
      <CodeStep
        email={step.email}
        onVerified={(mfaRequired) => setStep(mfaRequired ? { name: "mfa" } : { name: "password" })}
        onBack={() => setStep({ name: "email" })}
      />
    );
  }
  if (step.name === "mfa") {
    return (
      <>
        <Heading title="One more step">
          Your account has two-factor sign-in turned on. Enter the code from your authenticator app.
        </Heading>
        <MfaCodeForm submit={verifyMfa} submitLabel="Continue" onSuccess={() => setStep({ name: "password" })} />
      </>
    );
  }
  if (step.name === "password") return <PasswordStep />;
  return <EmailStep onSent={(email) => setStep({ name: "code", email })} />;
}

function Heading({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-5xl leading-none tracking-[-0.01em]">{title}</h1>
      <p className="mt-3 text-muted-foreground" role="status">
        {children}
      </p>
    </div>
  );
}

function EmailStep({ onSent }: { onSent: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (CAPTCHA_ENABLED && !captchaToken) {
      toast.error("Please wait a moment for the security check to finish.");
      return;
    }
    const token = captchaToken ?? undefined;
    startTransition(async () => {
      const result = await requestPasswordReset(email, token);
      setCaptchaKey((k) => k + 1); // single-use token: get a fresh one
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      onSent(email.trim().toLowerCase());
    });
  }

  return (
    <>
      <Heading title="Reset password">Enter your account&apos;s email and we&apos;ll send you a code.</Heading>
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="reset-email">Email</FieldLabel>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(error)}
              autoFocus
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>
          <Turnstile key={captchaKey} action="reset" onToken={setCaptchaToken} />
          <Button type="submit" size="lg" className="w-full" disabled={isPending || !email}>
            {isPending && <Spinner />}
            Send reset code
          </Button>
        </FieldGroup>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Log in
        </Link>
      </p>
    </>
  );
}

function CodeStep({
  email,
  onVerified,
  onBack,
}: {
  email: string;
  onVerified: (mfaRequired: boolean) => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length < 6) {
      setError("Enter the code from the email.");
      return;
    }
    startTransition(async () => {
      const result = await verifyResetCode({ email, code });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onVerified(result.data.mfaRequired);
    });
  }

  return (
    <>
      <Heading title="Check your email">
        If <span className="font-medium break-all text-foreground">{email}</span> has an account, we sent it a
        reset code. Enter it below.
      </Heading>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="reset-code">Reset code</FieldLabel>
          <Input
            id="reset-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="12345678"
            maxLength={10}
            aria-invalid={Boolean(error)}
            className="h-12 text-center font-mono text-2xl tracking-[0.4em] placeholder:tracking-[0.4em]"
          />
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldDescription>Can&apos;t find it? Check your spam or promotions folder.</FieldDescription>
          )}
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending && <Spinner />}
          Continue
        </Button>
      </form>
      <div className="mt-4 border-t pt-4 text-sm">
        <Button variant="link" size="sm" className="px-0 text-muted-foreground" onClick={onBack}>
          Didn&apos;t get a code? Start again
        </Button>
      </div>
    </>
  );
}

function PasswordStep() {
  const [isPending, startTransition] = useTransition();
  const form = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });
  const { errors } = form.formState;

  function onSubmit(values: SetPasswordInput) {
    startTransition(async () => {
      // On success the action redirects to the dashboard.
      const result = await setNewPassword(values);
      if (result && !result.ok) {
        toast.error(result.error);
        const messages = result.fieldErrors ?? {};
        if (messages.password?.[0]) form.setError("password", { message: messages.password[0] });
        if (messages.confirm?.[0]) form.setError("confirm", { message: messages.confirm[0] });
      }
    });
  }

  return (
    <>
      <Heading title="New password">Choose a new password. Other devices signed in to your account will be logged out.</Heading>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <Field data-invalid={Boolean(errors.password)}>
            <FieldLabel htmlFor="new-password">New password</FieldLabel>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              aria-invalid={Boolean(errors.password)}
              autoFocus
              {...form.register("password")}
            />
            <FieldError errors={[errors.password]} />
          </Field>
          <Field data-invalid={Boolean(errors.confirm)}>
            <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirm)}
              {...form.register("confirm")}
            />
            <FieldError errors={[errors.confirm]} />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending && <Spinner />}
            Save password
          </Button>
        </FieldGroup>
      </form>
    </>
  );
}
