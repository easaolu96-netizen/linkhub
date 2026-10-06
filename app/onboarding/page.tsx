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
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo href="/onboarding" />
        <SignOutButton />
      </header>
      <main id="main" tabIndex={-1} className="flex flex-1 justify-center px-5 pt-6 pb-20 sm:pt-14">
        <div className="w-full max-w-[440px]">
          <h1 className="font-display text-5xl leading-none tracking-[-0.01em]">Claim your link</h1>
          <p className="mt-3 mb-8 text-muted-foreground">
            Pick the username for your public page. You can change it later in Settings.
          </p>
          <OnboardingForm suggestion={suggestion} prefix={`${new URL(SITE_URL).host}/`} />
        </div>
      </main>
    </div>
  );
}
