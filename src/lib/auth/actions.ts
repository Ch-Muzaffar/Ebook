"use server";

import { redirect } from "next/navigation";
import { button, layout, sendEmail } from "@/lib/email/send";
import { getSiteSettings } from "@/lib/settings/queries";
import { siteUrl } from "@/lib/site-url";
import { sessionDb } from "@/lib/supabase/server";
import { serviceDb } from "@/lib/supabase/service";
import { rateLimit } from "./rate-limit";
import { getCurrentUser, safeNext } from "./session";

export type AuthState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string).trim() : "");
const isAdminEmail = (email: string) => !!process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

function passwordProblem(pw: string) {
  if (pw.length < 8) return "Use at least 8 characters for your password.";
  if (pw.length > 72) return "Password is too long (72 characters max).";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Include at least one letter and one number.";
  return null;
}

/**
 * Registration WITHOUT email confirmation (owner's choice). Accounts are created server-side
 * with the service role (email marked confirmed), then the user is signed in immediately.
 * The admin email is reserved — the admin account is created only by scripts/db/create-admin.mjs.
 */
export async function registerAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const fullName = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const password = typeof fd.get("password") === "string" ? (fd.get("password") as string) : "";
  const values = { name: fullName, email };

  if (str(fd, "website")) return { error: "Something went wrong. Please try again.", values }; // honeypot
  if (!fullName || fullName.length > 120) return { error: "Please enter your name (120 characters max).", values };
  if (!EMAIL.test(email) || email.length > 254) return { error: "Please enter a valid email address.", values };
  const pwProblem = passwordProblem(password);
  if (pwProblem) return { error: pwProblem, values };
  if (!(await rateLimit("register", 5, 60 * 60 * 1000))) return { error: "Too many sign-ups from this connection. Please try again later.", values };
  if (isAdminEmail(email)) return { error: "This email address can't be used to register here.", values };

  const { error } = await serviceDb().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return { error: "An account with this email already exists. Try signing in.", values };
    console.error("register:", error.message);
    return { error: "Could not create your account. Please try again.", values };
  }

  const db = await sessionDb();
  const signIn = await db.auth.signInWithPassword({ email, password });
  if (signIn.error) redirect("/login?registered=1");
  redirect(safeNext(fd.get("next")));
}

export async function loginAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = str(fd, "email").toLowerCase();
  const password = typeof fd.get("password") === "string" ? (fd.get("password") as string) : "";
  const values = { email };
  if (!EMAIL.test(email) || !password) return { error: "Enter your email address and password.", values };
  if (!(await rateLimit("login", 10, 15 * 60 * 1000, email))) return { error: "Too many sign-in attempts. Please wait 15 minutes and try again.", values };

  const db = await sessionDb();
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Email or password is incorrect.", values };

  const { data: profile } = await db.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  redirect(safeNext(fd.get("next"), profile?.role === "admin" ? "/admin" : "/dashboard"));
}

export async function logoutAction() {
  const db = await sessionDb();
  await db.auth.signOut();
  redirect("/");
}

/** Always answers the same way, so it can't be used to discover which emails have accounts. */
export async function requestPasswordResetAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = str(fd, "email").toLowerCase();
  if (!EMAIL.test(email)) return { error: "Please enter a valid email address.", values: { email } };
  if (!(await rateLimit("reset", 3, 60 * 60 * 1000))) return { error: "Too many requests. Please try again later.", values: { email } };

  // Generate the one-time recovery token with Supabase, but deliver the email through Resend
  // (our verified domain) — Supabase's built-in mailer only reaches the project's own team.
  const { data, error } = await serviceDb().auth.admin.generateLink({ type: "recovery", email });
  if (!error && data.properties?.hashed_token) {
    const link = `${siteUrl()}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery&next=${encodeURIComponent("/account/reset-password")}`;
    const { brandName } = await getSiteSettings();
    await sendEmail({
      to: email,
      subject: `Reset your ${brandName} password`,
      html: layout(
        brandName,
        `<p style="margin-top:0">We received a request to reset your password.</p><p>${button(link, "Choose a new password")}</p>
         <p style="font-size:13px;color:#5e5a52">This link works once and expires in 1 hour. If you didn't ask for this, you can ignore this email — your password won't change.</p>`,
      ),
      text: `We received a request to reset your password.\n\nChoose a new password: ${link}\n\nThis link works once and expires in 1 hour. If you didn't ask for this, ignore this email.`,
    });
  } else if (error && !/not found|no user/i.test(error.message)) {
    console.error("reset:", error.message);
  }
  // Same answer either way, so this form can't reveal which emails have accounts.
  return { ok: "If an account exists for that address, we've sent a link to reset the password." };
}

export async function updatePasswordAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your reset link has expired. Please request a new one." };
  const password = typeof fd.get("password") === "string" ? (fd.get("password") as string) : "";
  if (password !== fd.get("confirm")) return { error: "The two passwords don't match." };
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  const db = await sessionDb();
  const { error } = await db.auth.updateUser({ password });
  if (error) return { error: /different from the old/i.test(error.message) ? "Choose a password different from your current one." : "Could not update your password. Please try again." };
  return { ok: "Your password has been updated." };
}

export async function updateProfileAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  const fullName = str(fd, "name");
  if (!fullName || fullName.length > 120) return { error: "Please enter your name (120 characters max)." };
  const db = await sessionDb();
  // RLS + column privileges: users can update only their own full_name (never role/email).
  const { error } = await db.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (error) return { error: "Could not save. Please try again." };
  return { ok: "Saved." };
}
