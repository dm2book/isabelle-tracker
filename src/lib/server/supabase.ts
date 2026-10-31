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
  isAdmin: boolean;
}

export async function getSession(): Promise<Session | null> {
  const db = await userClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return null;
  return { user: data.user, db, isAdmin: isAdminEmail(data.user.email) };
}
