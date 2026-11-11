import Link from "next/link";
import { cn } from "@/lib/cn";
import { getSiteSettings } from "@/lib/settings/queries";

/** Brand name from Admin → Settings (cached). */
export async function Logo({ className }: { className?: string }) {
  const { brandName } = await getSiteSettings();
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5 font-serif text-h4 text-charcoal", className)}>
      <span aria-hidden className="block h-5 w-[3px] rounded-pill bg-gold" />
      {brandName}
    </Link>
  );
}
