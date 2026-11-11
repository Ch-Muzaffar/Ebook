import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-forms";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingIndicator } from "@/components/ui/states";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage() {
  return (
    <>
      <PageHeader title="Sign in" description="Access your library and downloads." />
      <Container>
        <Suspense fallback={<LoadingIndicator />}>
          <LoginForm />
        </Suspense>
      </Container>
    </>
  );
}
