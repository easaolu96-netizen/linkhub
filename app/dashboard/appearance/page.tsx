import type { Metadata } from "next";
import { AppearanceEditor } from "@/components/dashboard/appearance/appearance-editor";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "Appearance" };

export default function AppearancePage() {
  return (
    <>
      <PageHeader
        title="Appearance"
        description="Pick a theme, then fine-tune colours, buttons and font. The preview updates instantly."
      />
      <AppearanceEditor />
    </>
  );
}
