import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingIndicator } from "@/components/ui/states";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <PageHeader title="Reset your password" description="We'll email you a link to choose a new password." />
      <Container>
        <Suspense fallback={<LoadingIndicator />}>
          <ForgotPasswordForm />
        </Suspense>
      </Container>
    </>
  );
}
