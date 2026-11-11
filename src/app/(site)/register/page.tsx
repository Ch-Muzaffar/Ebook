import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/auth-forms";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingIndicator } from "@/components/ui/states";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function RegisterPage() {
  return (
    <>
      <PageHeader title="Create account" description="Keep your purchases in one place." />
      <Container>
        <Suspense fallback={<LoadingIndicator />}>
          <RegisterForm />
        </Suspense>
      </Container>
    </>
  );
}
