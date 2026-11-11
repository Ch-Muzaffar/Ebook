import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/session";
import { sessionDb } from "@/lib/supabase/server";

/** Email links (password reset) land here: exchange the one-time code for a session, then continue. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"), "/dashboard");
  if (code) {
    const db = await sessionDb();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL("/forgot-password?expired=1", request.url));
}
