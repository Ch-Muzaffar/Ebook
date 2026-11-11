import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resilientFetch } from "@/lib/supabase/fetch";

/**
 * Session handling + route protection (runs before rendering, only on account/admin routes so
 * public pages stay static and fast):
 * - refreshes the Supabase session cookie when needed;
 * - /admin/*      → must be signed in AND have the admin role (otherwise redirect);
 * - /dashboard, /account/* → must be signed in.
 * Admin Server Actions and RLS policies check again independently (defence in depth).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { fetch: resilientFetch },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
        for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v);
      },
    },
  });

  // getUser() validates the session with Supabase Auth (don't trust the cookie alone).
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const path = request.nextUrl.pathname;
  const needsLogin = path.startsWith("/admin") || path === "/dashboard" || path.startsWith("/account");

  const redirectTo = (to: string) => {
    const url = request.nextUrl.clone();
    const [pathname, query] = to.split("?");
    url.pathname = pathname;
    url.search = query ? `?${query}` : "";
    const res = NextResponse.redirect(url);
    for (const c of response.cookies.getAll()) res.cookies.set(c);
    return res;
  };

  if (needsLogin && !user) return redirectTo(`/login?next=${encodeURIComponent(path + request.nextUrl.search)}`);

  if (path.startsWith("/admin") && user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return redirectTo("/dashboard?notice=admin-only");
  }

  // Signed-in users don't need the sign-in / register pages.
  if (user && (path === "/login" || path === "/register")) return redirectTo("/dashboard");

  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/dashboard", "/account/:path*", "/login", "/register", "/auth/:path*", "/checkout", "/checkout/:path*"],
};
