import { AccountMenu } from "@/components/dashboard/account-menu";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { DashboardProvider } from "@/components/dashboard/dashboard-provider";
import { DesktopPreview, MobilePreview } from "@/components/dashboard/live-preview";
import { ViewPageButton } from "@/components/dashboard/view-page-button";
import { Logo } from "@/components/logo";
import { getAuthUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { SITE_URL } from "@/lib/env";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  // Verifies the session (redirects to /login) and that a username has been
  // claimed (redirects to /onboarding) before loading anything.
  const { profile, links } = await getDashboardData();
  const user = await getAuthUser();

  return (
    <DashboardProvider initialProfile={profile} initialLinks={links}>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-paper/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
            <Logo href="/dashboard" />
            <div className="flex min-w-0 items-center gap-3">
              <ViewPageButton host={new URL(SITE_URL).host} />
              <AccountMenu email={user?.email ?? null} />
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <DashboardNav />
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-[minmax(0,1fr)] gap-16 px-5 pt-12 pb-28 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:pb-16 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-24">
          <main id="main" tabIndex={-1} className="min-w-0 max-w-2xl">
            {children}
          </main>
          <DesktopPreview />
        </div>
        <MobilePreview />
      </div>
    </DashboardProvider>
  );
}
