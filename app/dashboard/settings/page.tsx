import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { DeleteAccount } from "@/components/dashboard/settings/delete-account";
import { ShareSettings } from "@/components/dashboard/settings/share-settings";
import { UsernameSettings } from "@/components/dashboard/settings/username-settings";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireUser } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";

export const metadata: Metadata = { title: "Settings" };

function Section({
  id,
  title,
  danger,
  children,
}: {
  id: string;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={
        danger
          ? "rounded-2xl border border-destructive/30 bg-card p-5 sm:p-6"
          : "rounded-2xl border bg-card p-5 sm:p-6"
      }
    >
      <h2 id={id} className={danger ? "mb-4 font-semibold text-destructive" : "mb-4 font-semibold"}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Settings" description="Your username, sharing and account." />
      <div className="flex flex-col gap-6">
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
        <Section id="danger-heading" title="Danger zone" danger>
          <DeleteAccount />
        </Section>
      </div>
    </>
  );
}
