/**
 * Supabase connection settings, shared by the server code and the session proxy.
 * Accepts the variable names used by the Supabase dashboard, the Vercel ↔ Supabase integration and
 * older Next.js templates, so a correct value under a common alternative name still works.
 * Only names are ever reported (in /setup), never values.
 */

type Source = { name: string | null; value: string };

function first(candidates: [string, string | undefined][]): Source {
  for (const [name, v] of candidates) {
    const t = v?.trim();
    if (t) return { name, value: t };
  }
  return { name: null, value: "" };
}

/** "abc.supabase.co/" or "https://abc.supabase.co/rest/v1" → "https://abc.supabase.co" */
export function normalizeSupabaseUrl(raw: string) {
  let u = raw.trim().replace(/\/+$/, "").replace(/\/(rest|auth)\/v1$/, "");
  if (u && !/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

// Each `process.env.X` is written out literally so Next.js can inline the NEXT_PUBLIC_ ones at build time.
export const supabaseUrlSource = first([
  ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
  ["SUPABASE_URL", process.env.SUPABASE_URL],
]);

export const supabasePublicKeySource = first([
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY],
  ["SUPABASE_ANON_KEY", process.env.SUPABASE_ANON_KEY],
  ["SUPABASE_PUBLISHABLE_KEY", process.env.SUPABASE_PUBLISHABLE_KEY],
]);

export const SUPABASE_URL = normalizeSupabaseUrl(supabaseUrlSource.value);
export const SUPABASE_PUBLIC_KEY = supabasePublicKeySource.value;

function jwtRole(key: string) {
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  try {
    return (JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

/** True if a key is a secret/service-role key (it must never be used as the public key). */
export const looksSecret = (key: string) => key.startsWith("sb_secret_") || jwtRole(key) === "service_role";

/** True if a key is a public (publishable/anon) key (it can't do the server's work). */
export const looksPublic = (key: string) => key.startsWith("sb_publishable_") || jwtRole(key) === "anon";

export const supabaseSecretKeySource = first([
  ["SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY],
  ["SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY],
]);
