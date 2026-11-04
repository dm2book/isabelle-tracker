import "server-only";
import { looksSecret, SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "../supabaseConfig";

const list = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const env = {
  supabaseUrl: SUPABASE_URL,
  // A secret key pasted into the public-key variable is refused: cloud mode stays off and /setup says why.
  supabaseAnonKey: looksSecret(SUPABASE_PUBLIC_KEY) ? "" : SUPABASE_PUBLIC_KEY,
  serviceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim(),
  adminEmails: list(process.env.ADMIN_EMAILS),
  allowedEmails: list(process.env.ALLOWED_EMAILS),
  rewardKey: process.env.REWARD_ENCRYPTION_KEY ?? "",
  appSecret: process.env.APP_SECRET ?? "",
  vapidPublic: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  vapidPrivate: process.env.VAPID_PRIVATE_KEY ?? "",
  vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
  cronSecret: process.env.CRON_SECRET ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : ""),
};

export const cloudEnabled = () => Boolean(env.supabaseUrl && env.supabaseAnonKey && env.serviceRoleKey && env.appSecret);
export const pushConfigured = () => Boolean(env.vapidPublic && env.vapidPrivate && cloudEnabled());
export const isAdminEmail = (email: string | null | undefined) => Boolean(email && env.adminEmails.includes(email.toLowerCase()));
export const isAllowedEmail = (email: string) => {
  const e = email.toLowerCase();
  return env.adminEmails.includes(e) || env.allowedEmails.includes(e);
};
