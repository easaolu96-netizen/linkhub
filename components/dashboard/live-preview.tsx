"use client";

import { Eye, X } from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { PhoneFrame } from "@/components/profile/phone-frame";
import { ProfileView } from "@/components/profile/profile-view";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function PreviewContent() {
  const { profile, links } = useDashboard();
  const visibleLinks = links.filter((link) => link.is_visible);
  return <ProfileView profile={profile} links={visibleLinks} mode="preview" />;
}

/** Sticky phone preview for desktop (lg+). */
export function DesktopPreview() {
  return (
    <aside aria-label="Live preview" className="sticky top-36 hidden self-start lg:block">
      <p className="mb-4 text-center text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
        Live preview
      </p>
      <PhoneFrame className="w-full xl:w-full">
        <PreviewContent />
      </PhoneFrame>
    </aside>
  );
}

/** Floating "Preview" button + full-screen dialog for mobile/tablet. */
export function MobilePreview() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full bg-ink px-5 text-paper shadow-[0_10px_30px_-10px_rgba(27,26,23,0.6)] hover:bg-ink/90 lg:hidden"
        >
          <Eye aria-hidden />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex w-auto max-w-none flex-col items-center gap-3 bg-transparent p-0 ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">Live preview</DialogTitle>
        <DialogDescription className="sr-only">How your public page looks right now.</DialogDescription>
        {/* Width derived from viewport height so the whole phone fits on short screens. */}
        <PhoneFrame className="w-[min(280px,calc((100dvh-7rem)*9/19))]">
          <PreviewContent />
        </PhoneFrame>
        <DialogClose asChild>
          <Button variant="secondary" className="rounded-full">
            <X aria-hidden />
            Close preview
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
