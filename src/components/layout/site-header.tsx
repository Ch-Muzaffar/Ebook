import { AccountLink } from "@/components/auth/account-link";
import { BagLink } from "@/components/cart/bag-link";
import { ThemeToggle } from "@/components/theme/theme";
import { mainNav } from "@/config/site";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLinks } from "./nav-links";

/** One frosted pill. `glass-layer` keeps the frosting on a pseudo-element, so a fixed panel inside
 *  (the mobile menu) is still positioned against the viewport. */
const pill = "glass-layer inline-flex items-center rounded-pill";

/**
 * Floating header: the logo, the navigation and each action sit in their own glass pills.
 * On the homepage the bar itself is fully transparent over the 3D library; on other pages a
 * soft frosted bar sits behind the pills (see .site-header in globals.css).
 */
export function SiteHeader() {
  return (
    // viewTransitionName keeps the header still while page content transitions underneath it.
    <header className="site-header sticky top-0 z-30 [view-transition-name:site-header]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-charcoal focus:px-4 focus:py-2 focus:text-ivory"
      >
        Skip to content
      </a>
      {/* Fine gold-foil hairline along the bottom edge (hidden on the homepage). */}
      <span aria-hidden className="header-rule pointer-events-none absolute inset-x-0 -bottom-px h-px bg-[linear-gradient(90deg,transparent,var(--color-gold)_30%,var(--color-gold)_70%,transparent)] opacity-30 transition-opacity" />

      <div className="mx-auto flex h-header w-full max-w-wide items-center justify-between gap-3 px-gutter">
        <div className={`${pill} h-11 min-w-0 px-3 sm:px-4`}>
          <Logo />
        </div>

        {/* Not using `pill` here: its inline-flex would override `hidden` on phones. */}
        <nav aria-label="Main" className="glass-layer hidden h-11 items-center rounded-pill p-1 md:flex">
          <NavLinks items={mainNav} />
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span className={`${pill} size-11 justify-center`}>
            <ThemeToggle />
          </span>
          {/* On small phones the account link lives in the menu, so the pills fit one row. */}
          <span className="glass-layer hidden size-11 items-center justify-center rounded-pill sm:inline-flex">
            <AccountLink />
          </span>
          <span className={`${pill} size-11 justify-center`}>
            <BagLink />
          </span>
          <span className="glass-layer inline-flex size-11 items-center justify-center rounded-pill md:hidden">
            <MobileMenu items={[...mainNav, { label: "Shopping bag", href: "/cart" }, { label: "My account", href: "/dashboard" }]} />
          </span>
        </div>
      </div>
    </header>
  );
}
