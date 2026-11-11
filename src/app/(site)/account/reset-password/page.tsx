import type { Metadata } from "next";
import { SetPasswordForm } from "@/components/auth/auth-forms";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

/** Reached from the reset email (via /auth/callback, which signs the user in). Protected by the proxy. */
export default function ResetPasswordPage() {
  return (
    <>
      <PageHeader title="Choose a new password" />
      <Container width="narrow" className="py-section">
        <div className="mx-auto max-w-md">
          <SetPasswordForm />
        </div>
      </Container>
    </>
  );
}
