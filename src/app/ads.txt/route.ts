import { getSiteSettings } from "@/lib/settings/queries";

/**
 * /ads.txt — authorises Google to sell ads on this domain. Published automatically once an
 * AdSense publisher ID is saved in Admin → Advertising; 404 until then. Cached via the "settings" tag.
 */
export async function GET() {
  const { ads } = await getSiteSettings();
  if (!ads.clientId) return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain" } });
  const pub = ads.clientId.replace(/^ca-/, "");
  return new Response(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
