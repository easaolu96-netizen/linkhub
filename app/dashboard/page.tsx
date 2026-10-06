import type { Metadata } from "next";
import { LinksEditor } from "@/components/dashboard/links/links-editor";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "Links" };

export default function LinksPage() {
  return (
    <>
      <PageHeader
        title="Links"
        description="Add, edit and drag to reorder. Hidden links stay saved but don't show on your page."
      />
      <LinksEditor />
    </>
  );
}
