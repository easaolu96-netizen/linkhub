import type { Metadata } from "next";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PageHeader, Section } from "@/components/dashboard/page-header";
import { DeleteAccount } from "@/components/dashboard/settings/delete-account";
import { ShareSettings } from "@/components/dashboard/settings/share-settings";
import { UsernameSettings } from "@/components/dashboard/settings/username-settings";
import { requireUser } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Settings" description="Your username, sharing and account." />
      <Section id="share-heading" title="Share your page">
        <ShareSettings siteUrl={SITE_URL} />
      </Section>
      <Section id="username-heading" title="Username">
        <UsernameSettings prefix={`${new URL(SITE_URL).host}/`} />
      </Section>
      <Section id="account-heading" title="Account">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </p>
          <SignOutButton />
        </div>
      </Section>
      <Section id="danger-heading" title="Delete account" tone="danger">
        <DeleteAccount />
      </Section>
    </>
  );
}
