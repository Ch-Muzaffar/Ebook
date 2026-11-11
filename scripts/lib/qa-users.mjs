/**
 * Temporary QA accounts for tests (service role). All test users use the qa-*@example.test
 * pattern and are deleted afterwards — real accounts are never touched.
 */
import { randomBytes } from "node:crypto";
import { connect, loadEnv } from "../db/env.mjs";

const env = loadEnv();
const admin = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };

export const qaEmail = (label) => `qa-${label}-${randomBytes(3).toString("hex")}@example.test`;
export const qaPassword = () => `Qa-${randomBytes(9).toString("base64url")}9`;

export async function createUser(email, password, { role = "customer", name = "QA User" } = {}) {
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: admin,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: name } }),
  });
  if (!r.ok) throw new Error(`createUser: ${r.status} ${await r.text()}`);
  const user = await r.json();
  if (role !== "customer") {
    const db = await connect();
    await db.query("update public.profiles set role = $1 where id = $2", [role, user.id]);
    await db.end();
  }
  return user;
}

/** Deletes every qa-*@example.test user (and, via cascade, their profiles). */
export async function deleteQaUsers() {
  const db = await connect();
  const { rows } = await db.query("select id from auth.users where email like 'qa-%@example.test'");
  await db.end();
  for (const { id } of rows) await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
  return rows.length;
}

/** Signs in through Supabase Auth directly and returns an access token (for API-level RLS tests). */
export async function accessToken(email, password) {
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`token: ${r.status}`);
  return (await r.json()).access_token;
}

export { env };
