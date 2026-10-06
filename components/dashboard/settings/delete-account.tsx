"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { deleteAccount } from "@/lib/actions/account";

export function DeleteAccount() {
  const { profile } = useDashboard();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();
  const matches = typed.trim() === profile.username;

  function onConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!matches) return;
    startTransition(async () => {
      // On success the action redirects to the home page.
      const result = await deleteAccount(typed);
      if (result && !result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Permanently delete your account, page, links and analytics. This can&apos;t be undone.
      </p>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (isPending) return;
          setOpen(next);
          if (!next) setTyped("");
        }}
      >
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive">
            <Trash2 aria-hidden />
            Delete account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <form onSubmit={onConfirm} className="contents">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                Your page at <strong>/{profile.username}</strong>, all links, your photo and all
                analytics will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-delete">
                Type <span className="font-mono font-semibold">{profile.username}</span> to confirm
              </Label>
              <Input
                id="confirm-delete"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                disabled={isPending}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel type="button" disabled={isPending}>
                Cancel
              </AlertDialogCancel>
              <Button type="submit" variant="destructive" disabled={!matches || isPending}>
                {isPending && <Spinner />}
                Delete forever
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
