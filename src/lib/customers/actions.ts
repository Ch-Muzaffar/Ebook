"use server";

import { requireAdmin } from "@/lib/auth/session";
import { serviceDb } from "@/lib/supabase/service";

/**
 * Change a user's role. Uses the service role because ordinary database users (including
 * admins) cannot write the role column at all — that's what stops anyone promoting themselves.
 * Guard rails: you can't change your own role, and the last admin can't be demoted.
 */
export async function setRoleAction(userId: string, role: "customer" | "admin"): Promise<{ error?: string }> {
  const me = await requireAdmin();
  if (role !== "customer" && role !== "admin") return { error: "Unknown role." };
  if (userId === me.id) return { error: "You can't change your own role." };
  const db = serviceDb();
  if (role === "customer") {
    const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) return { error: "At least one admin must remain." };
  }
  const { error } = await db.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: "Could not change the role. Please try again." };
  return {};
}
