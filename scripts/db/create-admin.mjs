/**
 * Creates (or promotes) the owner's admin account for ADMIN_EMAIL.
 *   node scripts/db/create-admin.mjs
 *
 * - New account: a strong random password is generated and written ONLY to
 *   .admin-initial-password.txt (git-ignored). It is never printed. Sign in, change the
 *   password in your dashboard, then delete that file.
 * - Existing account: its password is left untouched; it is just given the admin role.
 */
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { connect, loadEnv } from "./env.mjs";

const env = loadEnv();
const email = (env.ADMIN_EMAIL ?? "").toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("ADMIN_EMAIL is missing or invalid in .env.local");

const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
const db = await connect();
let { rows } = await db.query("select id from auth.users where lower(email) = $1", [email]);

if (!rows.length) {
  // Letters + digits + symbols; 24 chars from a CSPRNG.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%^*-_";
  const password = [...randomBytes(24)].map((b) => alphabet[b % alphabet.length]).join("") + "7a";
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: "Site Owner" } }),
  });
  if (!r.ok) throw new Error(`Could not create admin user: ${r.status} ${await r.text()}`);
  if (existsSync(".admin-initial-password.txt")) throw new Error(".admin-initial-password.txt already exists — not overwriting.");
  writeFileSync(
    ".admin-initial-password.txt",
    `Admin sign-in for ${email}\n\nTemporary password:\n${password}\n\n1. Go to /login and sign in.\n2. Change this password in your dashboard (Account → Change password).\n3. Delete this file.\n`,
  );
  ({ rows } = await db.query("select id from auth.users where lower(email) = $1", [email]));
  console.log("Admin account created. Temporary password written to .admin-initial-password.txt (not printed).");
} else {
  console.log("Admin account already exists — password unchanged.");
}

await db.query("update public.profiles set role = 'admin' where id = $1", [rows[0].id]);
const check = await db.query("select role from public.profiles where id = $1", [rows[0].id]);
console.log(`Role for ${email.replace(/(.{2}).*(@.*)/, "$1…$2")}: ${check.rows[0]?.role}`);
await db.end();
