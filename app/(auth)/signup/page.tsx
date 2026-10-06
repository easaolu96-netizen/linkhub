import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { normalizeUsernameInput } from "@/lib/validation/username";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  // Username typed into the landing page "claim your link" box, if any.
  const claimed = typeof params.username === "string" ? normalizeUsernameInput(params.username) : "";
  const next = claimed ? `/onboarding?username=${encodeURIComponent(claimed)}` : "/onboarding";

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {claimed ? `Claim @${claimed}` : "Create your LinkHub"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One link for everything you share. Free forever.
        </p>
      </div>
      <AuthForm mode="signup" next={next} />
    </>
  );
}
