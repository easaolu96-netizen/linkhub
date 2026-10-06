"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { UsernameField } from "@/components/username/username-field";
import { useUsernameAvailability } from "@/hooks/use-username-availability";
import { setUsername } from "@/lib/actions/username";

export function UsernameSettings({ prefix }: { prefix: string }) {
  const { profile, setProfile } = useDashboard();
  const [value, setValue] = useState(profile.username);
  const [isPending, startTransition] = useTransition();
  const availability = useUsernameAvailability(value === profile.username ? "" : value);
  const unchanged = value === profile.username;
  const canSave = !unchanged && availability.status === "available" && !isPending;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    startTransition(async () => {
      const result = await setUsername({ username: value });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setProfile((p) => ({ ...p, username: result.data.username }));
      toast.success(`Your page is now at ${prefix}${result.data.username}`);
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <Label htmlFor="settings-username">Username</Label>
      <UsernameField
        id="settings-username"
        value={value}
        onChange={setValue}
        availability={unchanged ? { status: "current", username: value } : availability}
        prefix={prefix}
      />
      <p className="text-sm text-muted-foreground">
        Heads up: your old link stops working as soon as you change it, and someone else could claim it.
      </p>
      <div className="flex justify-end gap-2">
        {!unchanged && (
          <Button type="button" variant="ghost" onClick={() => setValue(profile.username)} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!canSave}>
          {isPending && <Spinner />}
          Change username
        </Button>
      </div>
    </form>
  );
}
