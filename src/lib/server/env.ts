import "server-only";

const list = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "",
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
