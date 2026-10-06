import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { AvatarEditor } from "@/components/dashboard/profile/avatar-editor";
import { ProfileForm } from "@/components/dashboard/profile/profile-form";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" description="Your photo, name, bio and social icons." />
      <div className="flex flex-col gap-6">
        <section aria-labelledby="avatar-heading" className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 id="avatar-heading" className="mb-4 font-semibold">
            Profile photo
          </h2>
          <AvatarEditor />
        </section>
        <section aria-labelledby="details-heading" className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 id="details-heading" className="mb-4 font-semibold">
            Details
          </h2>
          <ProfileForm />
        </section>
      </div>
    </>
  );
}
