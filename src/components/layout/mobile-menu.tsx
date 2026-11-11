"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { NavItem } from "@/config/site";
import { cn } from "@/lib/cn";
import { CloseIcon, MenuIcon } from "./icons";
import { isActive } from "./nav-links";

/**
 * Full-screen mobile menu. Escape closes it and returns focus to the toggle;
 * page scroll is locked while open; links close it on tap.
 */
export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstLinkRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="relative z-50 inline-flex size-11 items-center justify-center rounded-pill text-charcoal hover:bg-charcoal/8"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="glass-strong fixed inset-0 z-40 border-0 px-gutter pt-[calc(var(--spacing-header)+2rem)] pb-10"
      >
        <nav aria-label="Mobile">
          <ul className="flex flex-col">
            {items.map((item, i) => {
              const active = isActive(pathname, item.href);
              return (
                <li
                  key={item.href}
                  className="border-b border-line motion-safe:animate-[menu-in_600ms_var(--ease-editorial)_both]"
                  style={{ animationDelay: `${80 + i * 55}ms` }}
                >
                  <Link
                    ref={i === 0 ? firstLinkRef : undefined}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-16 items-center justify-between font-serif text-h3",
                      active ? "text-charcoal" : "text-muted",
                    )}
                  >
                    {item.label}
                    {active && <span aria-hidden className="size-1.5 rounded-pill bg-gold" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
