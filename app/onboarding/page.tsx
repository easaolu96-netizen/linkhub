import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Logo } from "@/components/logo";
import { OnboardingForm } from "@/components/username/onboarding-form";
import { requireUser } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";
import { getCurrentProfile } from "@/lib/profile";
import { normalizeUsernameInput, suggestUsername } from "@/lib/validation/username";

export const metadata: Metadata = { title: "Claim your username" };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  if (profile?.username) redirect("/dashboard");

  const params = await searchParams;
  const requested = typeof params.username === "string" ? normalizeUsernameInput(params.username) : "";
  const suggestion = requested || suggestUsername(profile?.display_name) || suggestUsername(user.email);

  return (
    <main id="main" tabIndex={-1} className="flex flex-1 flex-col bg-muted/40">
      <header className="flex items-center justify-between p-4 sm:p-6">
        <Logo href="/onboarding" />
        <SignOutButton />
      </header>
      <div className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Claim your link</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Pick a username for your public page. You can change it later in Settings.
          </p>
          <OnboardingForm suggestion={suggestion} prefix={`${new URL(SITE_URL).host}/`} />
        </div>
      </div>
    </main>
  );
}
