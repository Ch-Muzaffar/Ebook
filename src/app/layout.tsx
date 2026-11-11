import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { CategoriesProvider } from "@/components/categories/categories-provider";
import { THEME_SCRIPT } from "@/components/theme/theme-script";
import { siteConfig } from "@/config/site";
import { getCategories } from "@/lib/categories/queries";
import { getSiteSettings } from "@/lib/settings/queries";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/** Brand name + description come from Admin → Settings (cached, tag "settings"). */
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: s.brandName, template: `%s · ${s.brandName}` },
    description: s.description,
    openGraph: { siteName: s.brandName, type: "website", locale: "en_US" },
    twitter: { card: "summary_large_image" },
    // Google Search Console "HTML tag" verification (optional — DNS verification needs no code).
    ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f5ef" },
    { media: "(prefers-color-scheme: dark)", color: "#11100e" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Cached (tag "categories"); shared with client components such as cards and filters.
  const categories = await getCategories();
  return (
    // suppressHydrationWarning: browser extensions (theme/dark-mode tools) inject attributes such as
    // data-theme and inline style onto <html> before React hydrates. This only silences attribute
    // differences on this one element; mismatches deeper in the tree are still reported.
    <html lang="en" suppressHydrationWarning className={`${playfair.variable} ${inter.variable} antialiased`}>
      <head>
        {/* Sets data-theme before first paint so the dark theme never flashes light. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <div aria-hidden className="ambient-light" />
        <CategoriesProvider categories={categories}>{children}</CategoriesProvider>
      </body>
    </html>
  );
}
