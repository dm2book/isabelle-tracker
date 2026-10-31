import { fail, ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_fr?: string;
  brands?: string;
  nutriments?: Record<string, number | string | undefined>;
}

const hits = new Map<string, { n: number; t: number }>();

/**
 * Proxy to Open Food Facts (free, no key). Only the search words are sent — never any personal data.
 * Values are returned as published (kcal per 100 g); nothing is estimated or invented.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 60);
  const lang = url.searchParams.get("lang") === "en" ? "en" : "fr";
  if (q.length < 2) return ok([]);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const h = hits.get(ip);
  if (h && now - h.t < 60_000 && h.n > 30) return fail("rate_limited", 429);
  hits.set(ip, h && now - h.t < 60_000 ? { n: h.n + 1, t: h.t } : { n: 1, t: now });

  const api = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  api.searchParams.set("search_terms", q);
  api.searchParams.set("search_simple", "1");
  api.searchParams.set("json", "1");
  api.searchParams.set("page_size", "12");
  api.searchParams.set("lc", lang);
  api.searchParams.set("fields", "code,product_name,product_name_fr,brands,nutriments");
  try {
    const res = await fetch(api, {
      headers: { "User-Agent": "IsabellesWorld/1.0 (personal wellbeing diary)" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return fail("unavailable", 502);
    const body = (await res.json()) as { products?: OffProduct[] };
    const items = (body.products ?? [])
      .map((p) => {
        const raw = p.nutriments?.["energy-kcal_100g"];
        const kcal = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : null;
        const name = (lang === "fr" ? p.product_name_fr || p.product_name : p.product_name || p.product_name_fr) ?? "";
        return { code: p.code ?? "", name: name.trim(), brand: (p.brands ?? "").split(",")[0]?.trim() ?? "", kcal100: kcal !== null && Number.isFinite(kcal) ? Math.round(kcal) : null };
      })
      .filter((p) => p.name);
    return ok(items);
  } catch {
    return fail("unavailable", 502);
  }
}
