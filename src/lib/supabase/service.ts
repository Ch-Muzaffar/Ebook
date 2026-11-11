import "server-only";

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";
import { resilientFetch } from "./fetch";

/**
 * SERVICE-ROLE client — bypasses Row Level Security. Server-only, never imported by client code.
 * Used for a small set of operations that must happen on the server on a user's behalf:
 * creating accounts without email confirmation, newsletter sign-ups, signed upload URLs,
 * and assigning the owner's admin role. Every caller validates input first.
 */
export function serviceDb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: resilientFetch },
  });
}
