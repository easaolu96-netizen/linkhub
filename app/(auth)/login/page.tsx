import type { Metadata } from "next";
import { AlertCircle } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Log in" };

// Only fixed, known messages are shown. Never echo text from the URL: an
// attacker could otherwise put their own "official" message on our domain.
const ERROR_MESSAGES: Record<string, string> = {
  link_invalid: "That sign-in link is invalid or has expired. Please try again.",
  signin_failed: "Sign-in failed. Please try again.",
  rate_limited: "Too many attempts. Please wait a few minutes and try again.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeRedirectPath(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? (ERROR_MESSAGES[params.error] ?? null) : null;
  const reauth = params.reauth === "1";

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-5xl leading-none tracking-[-0.01em]">
          {reauth ? "Confirm it's you" : "Welcome back"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {reauth
            ? "For your security, please log in again to continue."
            : "Log in to manage your page."}
        </p>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}
      <AuthForm mode="login" next={next} />
    </>
  );
}
