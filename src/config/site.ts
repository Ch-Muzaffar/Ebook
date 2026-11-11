import { siteUrl } from "@/lib/site-url";

/**
 * Static defaults only. The live brand, tagline, publisher and contact details come from
 * `site_settings` (Admin → Settings); these values are used only if the database is unreachable.
 */
export const siteConfig = {
  name: "Digital Traffic",
  tagline: "Ideas that inspire. Knowledge that transforms.",
  description: "Discover books and ideas designed to expand your perspective.",
  url: siteUrl(),
  currency: "USD",
} as const;

export type NavItem = { label: string; href: string };

/** PRD §5.1 main navigation (Shopping Bag is rendered separately as an icon link). */
export const mainNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Books", href: "/books" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
];

export const footerNav: { title: string; items: NavItem[] }[] = [
  {
    title: "Explore",
    items: [
      { label: "Books", href: "/books" },
      { label: "Blog", href: "/blog" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/register" },
      { label: "My library", href: "/dashboard" },
      { label: "Shopping bag", href: "/cart" },
    ],
  },
  {
    title: "Legal",
    items: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Refund Policy", href: "/refund-policy" },
    ],
  },
];

// Categories (PRD §6.3 / §9.1) are data, managed in Admin → Categories:
// see data/categories.json and src/lib/categories.
