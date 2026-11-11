"use server";

import { requireAdmin } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { sessionDb } from "@/lib/supabase/server";
import { serviceDb } from "@/lib/supabase/service";

export type SubscribeState = { error?: string; ok?: string } | undefined;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Newsletter sign-up. Written with the service role (the public can't touch the table),
 * after validation, a honeypot check and a per-connection rate limit. Existing addresses get
 * the same reply, so the form can't be used to discover who is subscribed.
 */
export async function subscribeAction(_prev: SubscribeState, fd: FormData): Promise<SubscribeState> {
  if (typeof fd.get("company") === "string" && (fd.get("company") as string).trim()) return { ok: "Thank you — you're subscribed." }; // honeypot
  const email = typeof fd.get("email") === "string" ? (fd.get("email") as string).trim().toLowerCase() : "";
  if (!email) return { error: "Please enter your email address." };
  if (!EMAIL.test(email) || email.length > 254) return { error: "Please enter a valid email address." };
  if (!(await rateLimit("subscribe", 5, 60 * 60 * 1000))) return { error: "Too many attempts. Please try again later." };

  const db = serviceDb();
  const { error } = await db.from("subscribers").insert({ email, source: "website" });
  if (error) {
    if (error.code === "23505") {
      // Already on the list: re-subscribe if they had left.
      await db.from("subscribers").update({ unsubscribed_at: null }).eq("email", email);
    } else {
      console.error("subscribe:", error.message);
      return { error: "Something went wrong. Please try again." };
    }
  }
  return { ok: "Thank you — you're subscribed." };
}

export async function unsubscribeAction(_prev: SubscribeState, fd: FormData): Promise<SubscribeState> {
  const token = typeof fd.get("token") === "string" ? (fd.get("token") as string) : "";
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { error: "This unsubscribe link is invalid." };
  const { data, error } = await serviceDb()
    .from("subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("id");
  if (error || !data?.length) return { error: "This unsubscribe link is invalid or has expired." };
  return { ok: "You've been unsubscribed. You won't receive further emails." };
}

export async function deleteSubscriberAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  const db = await sessionDb(); // RLS: admins only
  const { error } = await db.from("subscribers").delete().eq("id", id);
  return error ? { error: "Could not delete." } : {};
}
