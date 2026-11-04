import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { looksSecret, SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/lib/supabaseConfig";

/** Keeps the Supabase session cookie fresh (cloud mode only). */
export async function proxy(request: NextRequest) {
  const url = SUPABASE_URL;
  const key = SUPABASE_PUBLIC_KEY;
  if (!url || !key || looksSecret(key)) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|icon|apple-icon|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
