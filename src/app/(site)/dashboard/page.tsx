import type { Metadata } from "next";
import { Suspense } from "react";
import { SetPasswordForm } from "@/components/auth/auth-forms";
import { ProfileForm } from "@/components/auth/profile-form";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Button, LinkButton } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/ui/states";
import { Library } from "@/components/account/library";
import { logoutAction } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My library", robots: { index: false } };

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={<LoadingIndicator className="min-h-[60vh] justify-center" />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

const NOTICES: Record<string, string> = {
  "admin-only": "That area is for administrators only.",
  "download-missing": "That book isn't in your library.",
  "file-pending": "This book's file is being prepared. Please try again a little later, or contact us.",
  "download-limit": "Too many downloads in a short time. Please try again in an hour.",
  "download-error": "The download couldn't start. Please try again.",
};

async function Dashboard({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const user = await requireUser("/dashboard"); // the proxy already redirects signed-out visitors
  const notice = (await searchParams).notice;

  return (
    <>
      <PageHeader eyebrow="Account" title={user.fullName ? `Hello, ${user.fullName.split(" ")[0]}` : "My library"}>
        <div className="flex flex-wrap gap-3">
          {user.role === "admin" && <LinkButton href="/admin" size="sm">Open admin</LinkButton>}
          <form action={logoutAction}>
            <Button type="submit" variant="secondary" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </PageHeader>
      <Container className="flex flex-col gap-16 py-section">
        {typeof notice === "string" && NOTICES[notice] && (
          <p role="alert" className="rounded-md bg-gold/20 px-4 py-3 text-small text-charcoal">
            {NOTICES[notice]}
          </p>
        )}

        <Library userId={user.id} />

        <div className="grid gap-12 lg:grid-cols-2">
          <section aria-labelledby="details-heading" className="glass flex flex-col gap-6 rounded-lg p-6 sm:p-8">
            <h2 id="details-heading" className="font-serif text-h4">Account details</h2>
            <ProfileForm name={user.fullName} email={user.email} />
          </section>
          <section aria-labelledby="password-heading" className="glass flex flex-col gap-6 rounded-lg p-6 sm:p-8">
            <h2 id="password-heading" className="font-serif text-h4">Change password</h2>
            <SetPasswordForm title="Change password" />
          </section>
        </div>
      </Container>
    </>
  );
}
