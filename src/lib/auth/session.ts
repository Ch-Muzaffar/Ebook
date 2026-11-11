import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { sessionDb } from "@/lib/supabase/server";

export type Role = "customer" | "admin";
export type CurrentUser = { id: string; email: string; fullName: string; role: Role };

/**
 * The signed-in user, verified with Supabase Auth (getUser validates the token server-side —
 * never trust an unverified cookie for authorisation), plus their profile and role.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  await connection(); // always per-request: never prerender anything that depends on who is signed in
  const db = await sessionDb();
  const { data } = await db.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await db.from("profiles").select("full_name, role").eq("id", data.user.id).maybeSingle();
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    fullName: profile?.full_name ?? "",
    role: (profile?.role as Role) ?? "customer",
  };
}

export async function requireUser(next = "/dashboard"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/**
 * Call first in every admin Server Action and admin data function. Actions are callable
 * directly (not only from admin pages), so each one must authorise itself. RLS in the
 * database enforces the same rule independently.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Unauthorized");
  return user;
}

/** Only allow same-site relative redirects (prevents open redirects via ?next=). */
export function safeNext(next: unknown, fallback = "/dashboard") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
