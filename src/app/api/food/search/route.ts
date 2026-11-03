import { fail, ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

interface FoodItem {
  code: string;
  name: string;
  brand: string;
  kcal100: number | null;
}

type Raw = Record<string, unknown>;

// Open Food Facts asks API clients to identify themselves. A project URL, no personal data.
const USER_AGENT = "IsabellesWorld/1.1 (+https://github.com/dm2book/isabelle-tracker)";
const hits = new Map<string, { n: number; t: number }>();

function kcalOf(nutriments: unknown): number | null {
  if (!nutriments || typeof nutriments !== "object") return null;
  const n = nutriments as Raw;
  const raw = n["energy-kcal_100g"] ?? n["energy-kcal"];
  const v = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
  return Number.isFinite(v) ? Math.round(v) : null;
}

function normalize(p: Raw, lang: "fr" | "en"): FoodItem {
  const local = (lang === "fr" ? p.product_name_fr : p.product_name_en) as string | undefined;
  const name = String(local || p.product_name || p.product_name_fr || "").trim();
  const brandsRaw = p.brands;
  const brand = Array.isArray(brandsRaw) ? String(brandsRaw[0] ?? "") : String(brandsRaw ?? "").split(",")[0];
  return { code: String(p.code ?? ""), name, brand: brand.trim(), kcal100: kcalOf(p.nutriments) };
}

async function getJson(url: URL): Promise<Raw> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(7000), cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Raw;
}

/** Newer Open Food Facts search service (fast full-text search). */
async function searchV3(q: string, lang: "fr" | "en") {
  const u = new URL("https://search.openfoodfacts.org/search");
  u.searchParams.set("q", q);
  u.searchParams.set("langs", lang);
  u.searchParams.set("page_size", "12");
  u.searchParams.set("fields", "code,product_name,product_name_fr,product_name_en,brands,nutriments");
  const body = await getJson(u);
  return ((body.hits as Raw[]) ?? []).map((p) => normalize(p, lang));
}

/** Legacy search endpoint, used if the newer one is unavailable. */
async function searchLegacy(q: string, lang: "fr" | "en") {
  const u = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  u.searchParams.set("search_terms", q);
  u.searchParams.set("search_simple", "1");
  u.searchParams.set("json", "1");
  u.searchParams.set("page_size", "12");
  u.searchParams.set("lc", lang);
  u.searchParams.set("fields", "code,product_name,product_name_fr,product_name_en,brands,nutriments");
  const body = await getJson(u);
  return ((body.products as Raw[]) ?? []).map((p) => normalize(p, lang));
}

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

  for (const [label, search] of [["search", searchV3], ["legacy", searchLegacy]] as const) {
    try {
      const items = (await search(q, lang)).filter((p) => p.name);
      return ok(items);
    } catch (e) {
      // Logged for diagnosis in Vercel → Logs. Contains only the endpoint and the error, never the query.
      console.warn(`food search: ${label} endpoint failed — ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }
  return fail("unavailable", 502);
}
