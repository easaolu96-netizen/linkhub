"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { DashboardLink, ProfileData } from "@/lib/types";

type Updater<T> = T | ((previous: T) => T);

type DashboardContextValue = {
  profile: ProfileData;
  links: DashboardLink[];
  setProfile: (next: Updater<ProfileData>) => void;
  setLinks: (next: Updater<DashboardLink[]>) => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

/**
 * Client-side source of truth for the dashboard. Editors update it
 * optimistically (and persist via Server Actions); the live preview reads it,
 * so changes appear instantly.
 */
export function DashboardProvider({
  initialProfile,
  initialLinks,
  children,
}: {
  initialProfile: ProfileData;
  initialLinks: DashboardLink[];
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [links, setLinks] = useState(initialLinks);

  const value = useMemo(
    () => ({ profile, links, setProfile, setLinks }),
    [profile, links],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard must be used inside <DashboardProvider>");
  return context;
}
