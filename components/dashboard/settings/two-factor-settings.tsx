"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { MfaCodeForm } from "@/components/auth/mfa-code-form";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { confirmMfaEnrollment, disableMfa, startMfaEnrollment } from "@/lib/actions/mfa";

type Enrollment = { factorId: string; qrCode: string; secret: string };

export function TwoFactorSettings({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);
  const [isStarting, startStarting] = useTransition();

  function onStart() {
    startStarting(async () => {
      const result = await startMfaEnrollment();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEnrollment(result.data);
    });
  }

  if (enabled) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="font-medium text-foreground">On.</span> Logging in asks for a code from your
            authenticator app.
          </span>
        </p>
        <AlertDialog open={disableOpen} onOpenChange={setDisableOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="shrink-0">
              Turn off
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Turn off two-factor sign-in?</AlertDialogTitle>
              <AlertDialogDescription>
                Your account will be protected by your password only. Enter a current code to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <MfaCodeForm
              id="mfa-disable-code"
              submit={disableMfa}
              submitLabel="Turn off"
              onSuccess={(result) => {
                toast.success(result.message ?? "Two-factor sign-in is off");
                setDisableOpen(false);
                router.refresh();
              }}
            />
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (enrollment) {
    return (
      <div className="flex flex-col gap-5">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Open an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, Authy…).</li>
          <li>Scan this QR code, or enter the setup key by hand.</li>
          <li>Type the 6-digit code the app shows.</li>
        </ol>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {/* Supabase returns the QR code as an SVG data URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrollment.qrCode}
            alt="QR code for your authenticator app"
            width={176}
            height={176}
            className="rounded-lg border bg-white p-2"
          />
          <div className="min-w-0 text-sm">
            <p className="text-muted-foreground">Setup key</p>
            <code className="mt-1 block font-mono text-sm break-all text-foreground select-all">
              {enrollment.secret}
            </code>
          </div>
        </div>
        <div className="max-w-sm">
          <MfaCodeForm
            id="mfa-enroll-code"
            autoFocus={false}
            submit={(code) => confirmMfaEnrollment(enrollment.factorId, code)}
            submitLabel="Turn on"
            onSuccess={(result) => {
              toast.success(result.message ?? "Two-factor sign-in is on");
              setEnrollment(null);
              router.refresh();
            }}
          />
        </div>
        <Button variant="link" size="sm" className="self-start px-0 text-muted-foreground" onClick={() => setEnrollment(null)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        When you log in, also ask for a 6-digit code from an authenticator app on your phone.
      </p>
      <Button variant="outline" className="shrink-0" onClick={onStart} disabled={isStarting}>
        {isStarting && <Spinner />}
        Turn on
      </Button>
    </div>
  );
}
