import { siteConfig } from "@/config/site";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: siteConfig.currency,
});

export function formatPrice(cents: number): string {
  return priceFormatter.format(cents / 100);
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}
