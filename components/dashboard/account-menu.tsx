"use client";

import Image from "next/image";
import Link from "next/link";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/app/auth/actions";

/** Avatar button that opens account actions (view page, settings, log out). */
export function AccountMenu({ email }: { email: string | null }) {
  const { profile } = useDashboard();
  const name = profile.display_name || `@${profile.username}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="relative flex size-9 items-center justify-center overflow-hidden rounded-full bg-ink text-sm font-medium text-paper outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt="" fill unoptimized className="object-cover" />
        ) : (
          (profile.display_name || profile.username).slice(0, 1).toUpperCase()
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate font-medium text-foreground">{name}</span>
          {email && <span className="block truncate text-xs text-muted-foreground">{email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={`/${profile.username}`} target="_blank" rel="noopener">
            View public page
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              Log out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
