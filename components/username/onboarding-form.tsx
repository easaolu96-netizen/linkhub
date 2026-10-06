"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { UsernameField } from "@/components/username/username-field";
import { useUsernameAvailability } from "@/hooks/use-username-availability";
import { setUsername } from "@/lib/actions/username";

export function OnboardingForm({ suggestion, prefix }: { suggestion: string; prefix: string }) {
  const router = useRouter();
  const [username, setValue] = useState(suggestion);
  const [isPending, startTransition] = useTransition();
  const availability = useUsernameAvailability(username);

  const canSubmit = availability.status === "available" && !isPending;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    startTransition(async () => {
      const result = await setUsername({ username });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Username saved");
      router.replace("/dashboard");
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Label htmlFor="username">Your username</Label>
      <UsernameField
        id="username"
        value={username}
        onChange={setValue}
        availability={availability}
        prefix={prefix}
        autoFocus
      />
      <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
        {isPending ? <Spinner /> : null}
        Claim my link
        {!isPending && <ArrowRight aria-hidden />}
      </Button>
    </form>
  );
}
