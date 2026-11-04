import { ZodError } from "zod";
import { cloudEnabled } from "@/lib/server/env";
import { getSession } from "@/lib/server/supabase";
import { fail, HttpError, ok, sameOrigin } from "@/lib/server/http";
import { importBatch, importBegin, importFinish } from "@/lib/server/importer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!cloudEnabled()) return fail("local_mode", 400);
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const s = await getSession();
  if (!s) return fail("unauthorized", 401);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.step !== "string") return fail("invalid", 400);
  try {
    if (body.step === "begin") return ok(await importBegin(s, body));
    if (body.step === "batch") return ok(await importBatch(s, body));
    if (body.step === "finish") return ok(await importFinish(s, body));
    return fail("invalid", 400);
  } catch (e) {
    if (e instanceof HttpError) return fail(e.code, e.status);
    if (e instanceof ZodError) return fail("invalid", 400);
    console.error("import error", body.step, e instanceof Error ? e.message : "unknown");
    return fail("error", 500);
  }
}
