import type { Metadata } from "next";
import { MfaChallenge } from "@/components/auth/mfa-challenge";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Two-factor sign-in", robots: { index: false } };

// proxy.ts only lets signed-in users who still need the code reach this page.
export default async function MfaPage({ searchParams }: PageProps<"/login/mfa">) {
  const params = await searchParams;
  const next = safeRedirectPath(typeof params.next === "string" ? params.next : null);

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-5xl leading-none tracking-[-0.01em]">One more step</h1>
        <p className="mt-3 text-muted-foreground">
          Your account has two-factor sign-in turned on. Enter the code from your authenticator app.
        </p>
      </div>
      <MfaChallenge next={next} />
    </>
  );
}
