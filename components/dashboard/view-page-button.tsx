"use client";

import { ExternalLink } from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { Button } from "@/components/ui/button";

export function ViewPageButton() {
  const { profile } = useDashboard();
  return (
    <Button asChild variant="outline" size="sm">
      <a href={`/${profile.username}`} target="_blank" rel="noopener">
        <ExternalLink aria-hidden />
        <span className="hidden sm:inline">View page</span>
        <span className="sr-only sm:hidden">View your public page</span>
      </a>
    </Button>
  );
}
