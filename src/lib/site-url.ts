/**
 * Absolute site URL for canonical links, sitemaps, emails and payment redirects.
 * NEXT_PUBLIC_SITE_URL wins; otherwise production builds use the real domain and development
 * uses localhost.
 */
export const PRODUCTION_URL = "https://digitaltraffic.blog";

export function siteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  return (fromEnv || (process.env.NODE_ENV === "production" ? PRODUCTION_URL : "http://localhost:3000")).replace(/\/+$/, "");
}
