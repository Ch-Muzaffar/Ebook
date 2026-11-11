"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

type Item = { label: string; href: string; phase?: string };

/** PRD §5.3 admin sections. Items with `phase` are not built yet and are shown disabled. */
const ITEMS: Item[] = [
  { label: "Overview", href: "/admin" },
  { label: "Books", href: "/admin/products" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Customers", href: "/admin/customers" },
  { label: "Articles", href: "/admin/articles" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Subscribers", href: "/admin/subscribers" },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "Settings", href: "/admin/settings" },
  { label: "Advertising", href: "/admin/advertising" },
];

/** URL-aware nav (highlights the current section). Render inside <Suspense> with AdminNavList as fallback. */
export function AdminNav() {
  return <AdminNavList pathname={usePathname()} />;
}

/** Same nav without reading the URL — used as the prerendered fallback. */
export function AdminNavList({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Admin">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {ITEMS.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          if (item.phase)
            return (
              <li key={item.href} className="shrink-0">
                <span
                  aria-disabled
                  title={`Arrives in ${item.phase}`}
                  className="flex min-h-10 items-center justify-between gap-3 rounded-md px-3 text-small text-muted/60"
                >
                  {item.label}
                  <span className="hidden text-[0.6875rem] uppercase tracking-wide lg:inline">{item.phase}</span>
                </span>
              </li>
            );
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center rounded-md px-3 text-small",
                  active ? "bg-charcoal text-ivory" : "text-charcoal hover:bg-beige",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
