"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { login, signup } from "@/app/auth/actions";
import { EmailCodeStep } from "@/components/auth/email-code-step";
import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { loginSchema, signupSchema, type LoginInput } from "@/lib/validation/auth";

type Mode = "login" | "signup";

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const [isPending, startTransition] = useTransition();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const isLogin = mode === "login";

  const form = useForm<LoginInput>({
    resolver: zodResolver(isLogin ? loginSchema : signupSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginInput) {
    startTransition(async () => {
      const result = isLogin ? await login(values, next) : await signup(values, next);
      // On success the action redirects, so we only get here on errors or
      // when the user still has to confirm their email with a code.
      if (!result) return;
      if (!result.ok) {
        toast.error(result.error);
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0] && (field === "email" || field === "password")) {
            form.setError(field, { message: messages[0] });
          }
        }
        return;
      }
      setSentTo(values.email);
    });
  }

  if (sentTo) {
    return (
      <EmailCodeStep
        email={sentTo}
        next={next ?? (isLogin ? "/dashboard" : "/onboarding")}
        onBack={() => setSentTo(null)}
      />
    );
  }

  const { errors } = form.formState;

  return (
    <div className="flex flex-col gap-6">
      <GoogleButton next={next ?? (isLogin ? "/dashboard" : "/onboarding")} />

      <FieldSeparator>or continue with email</FieldSeparator>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              {...form.register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          <Field data-invalid={Boolean(errors.password)}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder={isLogin ? "Your password" : "At least 8 characters"}
              aria-invalid={Boolean(errors.password)}
              {...form.register("password")}
            />
            <FieldError errors={[errors.password]} />
          </Field>

          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending && <Spinner />}
            {isLogin ? "Log in" : "Create account"}
          </Button>
        </FieldGroup>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <Link
          href={isLogin ? "/signup" : "/login"}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {isLogin ? "Sign up" : "Log in"}
        </Link>
      </p>
    </div>
  );
}
