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
      <div className="mb-8">
        <h1 className="font-display text-5xl leading-none tracking-[-0.01em] break-words">
          {claimed ? (
            <>
              Claim <span className="text-green">@{claimed}</span>
            </>
          ) : (
            "Create your page"
          )}
        </h1>
        <p className="mt-3 text-muted-foreground">It&apos;s free and takes about a minute.</p>
      </div>
      <AuthForm mode="signup" next={next} />
    </>
  );
}
