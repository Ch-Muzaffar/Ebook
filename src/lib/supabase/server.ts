import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { assertSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import { resilientFetch } from "./fetch";

/**
 * Client bound to the signed-in user's session cookies (Server Components, Server Actions,
 * Route Handlers). All admin reads/writes go through this client, so the database's RLS
 * policies — not just app code — enforce that only admins can change content.
 */
export async function sessionDb() {
  assertSupabaseConfigured();
  await connection(); // a session client is always per-request — never part of a prerender
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: resilientFetch },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component (read-only cookies): the proxy refreshes sessions instead.
        }
      },
    },
  });
}
