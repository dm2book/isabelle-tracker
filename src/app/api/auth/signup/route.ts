import { fail } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Open sign-up is permanently disabled. Accounts are created only from a single-use invitation link
 * that Ewan generates in his panel (POST /api/auth/join). Admin accounts are created in the Supabase
 * dashboard and are never created from the app.
 */
export async function POST() {
  return fail("signup_disabled", 410);
}
