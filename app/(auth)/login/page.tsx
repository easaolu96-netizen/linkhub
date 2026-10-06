import type { Metadata } from "next";
import { AlertCircle } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeRedirectPath(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-5xl leading-none tracking-[-0.01em]">Welcome back</h1>
        <p className="mt-3 text-muted-foreground">Log in to manage your page.</p>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error.slice(0, 200)}
        </div>
      )}
      <AuthForm mode="login" next={next} />
    </>
  );
}
