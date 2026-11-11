"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/config/site";
import { cn } from "@/lib/cn";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop navigation links with an active-page indicator. */
export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            {/* Each link is its own pill inside the nav pill; the current page is filled. */}
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-pill px-4 text-small tracking-wide transition-colors duration-(--duration-base) ease-editorial",
                active
                  ? "bg-charcoal text-ivory shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]"
                  : "text-muted hover:bg-charcoal/8 hover:text-charcoal",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export { isActive };
