import { fail } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * E-mail password resets are turned off: Supabase's built-in mail only reaches the project's team, and
 * an open endpoint that sends mail is needless attack surface. Ewan creates a single-use reset link in
 * Espace Ewan instead (see /api/admin "reset.create" and /reset).
 */
export async function POST() {
  return fail("reset_by_link", 410);
}
