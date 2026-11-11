import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/session";
import { sessionDb } from "@/lib/supabase/server";

/**
 * Email links (password reset) land here: verify the one-time token, which signs the user in,
 * then continue to the next page (e.g. "choose a new password").
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(request.nextUrl.searchParams.get("next"), "/dashboard");
  if (tokenHash && type === "recovery") {
    const db = await sessionDb();
    const { error } = await db.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL("/forgot-password?expired=1", request.url));
}
