import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { DashboardProvider } from "@/components/dashboard/dashboard-provider";
import { DesktopPreview, MobilePreview } from "@/components/dashboard/live-preview";
import { ViewPageButton } from "@/components/dashboard/view-page-button";
import { Logo } from "@/components/logo";
import { getDashboardData } from "@/lib/dashboard";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  // Verifies the session (redirects to /login) and that a username has been
  // claimed (redirects to /onboarding) before loading anything.
  const { profile, links } = await getDashboardData();

  return (
    <DashboardProvider initialProfile={profile} initialLinks={links}>
      <div className="flex flex-1 flex-col bg-muted/40">
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
            <Logo href="/dashboard" />
            <div className="flex items-center gap-2">
              <ViewPageButton />
              <SignOutButton />
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-2 sm:px-4">
            <DashboardNav />
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 pt-6 pb-28 lg:grid-cols-[minmax(0,1fr)_320px] lg:pb-12 xl:grid-cols-[minmax(0,1fr)_340px]">
          <main id="main" tabIndex={-1} className="min-w-0">{children}</main>
          <DesktopPreview />
        </div>
        <MobilePreview />
      </div>
    </DashboardProvider>
  );
}
