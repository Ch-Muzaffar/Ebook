import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/** /robots.txt — allow the public site, keep private and transactional areas out of search. */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/account", "/checkout", "/cart", "/login", "/register", "/forgot-password", "/auth", "/api", "/newsletter"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
