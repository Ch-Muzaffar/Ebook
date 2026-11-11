import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/auth/rate-limit";
import { getCurrentUser } from "@/lib/auth/session";
import { serviceDb } from "@/lib/supabase/service";

/**
 * Secure download (PRD §8.6, §12.3): checks the signed-in customer has an active (not revoked)
 * entitlement for this book, then redirects to a signed Storage URL that expires in 60 seconds.
 * The file itself lives in a PRIVATE bucket and is never publicly addressable.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url), 303);
  const user = await getCurrentUser();
  if (!user) return to(`/login?next=${encodeURIComponent("/dashboard")}`);
  if (!/^[0-9a-f-]{36}$/i.test(productId)) return to("/dashboard?notice=download-missing");
  if (!(await rateLimit("download", 30, 60 * 60 * 1000, user.id))) return to("/dashboard?notice=download-limit");

  const db = serviceDb();
  const { data: grant } = await db
    .from("downloads")
    .select("id, download_count")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .is("revoked_at", null)
    .maybeSingle();
  if (!grant) return to("/dashboard?notice=download-missing");

  const { data: file } = await db.from("product_files").select("path, file_name").eq("product_id", productId).maybeSingle();
  if (!file) return to("/dashboard?notice=file-pending");

  const { data: signed, error } = await db.storage.from("ebook-files").createSignedUrl(file.path, 60, { download: file.file_name });
  if (error || !signed) {
    console.error("download:", error?.message);
    return to("/dashboard?notice=download-error");
  }
  await db.from("downloads").update({ download_count: grant.download_count + 1, last_downloaded_at: new Date().toISOString() }).eq("id", grant.id);
  const res = NextResponse.redirect(signed.signedUrl, 303);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
