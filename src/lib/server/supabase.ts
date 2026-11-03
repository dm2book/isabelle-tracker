import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { env, isAdminEmail } from "./env";

/** Supabase client bound to the signed-in user's session (Row Level Security applies). */
export async function userClient(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a context where cookies are read-only */
        }
      },
    },
  });
}

let admin: SupabaseClient | null = null;
/** Service-role client. Bypasses RLS: only use after explicit authorization checks. Never sent to the browser. */
export function serviceClient(): SupabaseClient {
  if (!admin) {
    admin = createClient(env.supabaseUrl, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

export interface Session {
  user: User;
  db: SupabaseClient;
  /** Full admin rights: listed in ADMIN_EMAILS **and** granted the role in the database. */
  isAdmin: boolean;
  /** Listed in ADMIN_EMAILS but the role is not granted yet (may only see the setup checklist). */
  isAdminCandidate: boolean;
}

/**
 * Admin rights need two independent things:
 *  1. the email is in the ADMIN_EMAILS server variable, and
 *  2. the account's app_metadata.role is "admin". app_metadata can only be written with the service
 *     role or SQL (never by the user or the browser), so registering Ewan's address somewhere else
 *     can never grant admin rights.
 */
export function hasAdminRole(user: User): boolean {
  return isAdminEmail(user.email) && (user.app_metadata as { role?: string } | undefined)?.role === "admin";
}

export async function getSession(): Promise<Session | null> {
  const db = await userClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return null;
  return { user: data.user, db, isAdmin: hasAdminRole(data.user), isAdminCandidate: isAdminEmail(data.user.email) };
}
