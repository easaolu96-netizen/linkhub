import type { Metadata } from "next";
import { ResetPasswordFlow } from "@/components/auth/reset-password-flow";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ResetPasswordPage() {
  return <ResetPasswordFlow />;
}
