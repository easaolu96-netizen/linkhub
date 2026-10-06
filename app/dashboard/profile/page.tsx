import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/dashboard/page-header";
import { AvatarEditor } from "@/components/dashboard/profile/avatar-editor";
import { ProfileForm } from "@/components/dashboard/profile/profile-form";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" description="Your photo, name, bio and social icons." />
      <Section id="avatar-heading" title="Photo">
        <AvatarEditor />
      </Section>
      <Section id="details-heading" title="Details">
        <ProfileForm />
      </Section>
    </>
  );
}
