"use client";

import { signOut } from "@/app/auth/actions";
import { MfaCodeForm } from "@/components/auth/mfa-code-form";
import { Button } from "@/components/ui/button";
import { verifyMfa } from "@/lib/actions/mfa";

/** Sign-in step for accounts with two-factor sign-in on. */
export function MfaChallenge({ next }: { next: string }) {
  return (
    <div className="flex flex-col gap-6">
      <MfaCodeForm
        submit={verifyMfa}
        submitLabel="Verify and continue"
        // Full navigation so the server sees the upgraded session cookies.
        onSuccess={() => window.location.assign(next)}
      />
      <form action={signOut} className="border-t pt-4 text-sm">
        <Button type="submit" variant="link" size="sm" className="px-0 text-muted-foreground">
          Use a different account
        </Button>
      </form>
    </div>
  );
}
