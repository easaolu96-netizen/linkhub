"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** Shows a confirmation after account deletion (redirected here with ?deleted=1). */
export function DeletedNotice() {
  const params = useSearchParams();
  const router = useRouter();
  const deleted = params.get("deleted") === "1";

  useEffect(() => {
    if (!deleted) return;
    toast.success("Your account and all its data have been deleted.");
    router.replace("/", { scroll: false });
  }, [deleted, router]);

  return null;
}
