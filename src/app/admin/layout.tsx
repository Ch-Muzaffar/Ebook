import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminNav, AdminNavList } from "@/components/admin/admin-nav";
import { NoTracking } from "@/components/consent/tag-manager";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/settings/queries";

export async function generateMetadata(): Promise<Metadata> {
  const { brandName } = await getSiteSettings();
  return { title: { default: "Admin", template: `%s · Admin · ${brandName}` }, robots: { index: false, follow: false } };
}

/**
 * Functional admin shell (no public header/footer). Access: src/proxy.ts requires a signed-in
 * admin; every admin action calls requireAdmin(); RLS enforces the same in the database.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { brandName } = await getSiteSettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <NoTracking />
      <header className="glass sticky top-0 z-20 rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex h-header w-full max-w-wide items-center justify-between gap-4 px-gutter">
          <Link href="/admin" className="truncate font-serif text-h4">
            {brandName} <span className="text-muted">· Admin</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="hidden text-small text-muted hover:text-charcoal sm:inline">
              View site ↗
            </Link>
            <Suspense fallback={null}>
              <SignedInAs />
            </Suspense>
          </div>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-wide flex-1 gap-8 px-gutter py-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[calc(var(--spacing-header)+2rem)] lg:self-start">
          <Suspense fallback={<AdminNavList pathname="" />}>
            <AdminNav />
          </Suspense>
        </aside>
        <main id="main" className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

async function SignedInAs() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <form action={logoutAction} className="flex items-center gap-3">
      <span className="hidden max-w-48 truncate text-caption text-muted md:inline" title={user.email}>
        {user.email}
      </span>
      <Button type="submit" variant="secondary" size="sm">
        Sign out
      </Button>
    </form>
  );
}
