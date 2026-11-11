import "server-only";

import { createClient } from "@supabase/supabase-js";
import { assertSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import { resilientFetch } from "./fetch";

/**
 * Session-less client for PUBLIC, cacheable reads ("use cache" functions).
 * It never carries a user session, so Row Level Security returns exactly what an anonymous
 * visitor may see (published books, live articles, categories, settings).
 */
export function publicDb() {
  assertSupabaseConfigured();
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: resilientFetch },
  });
}
