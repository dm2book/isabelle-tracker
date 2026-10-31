import { ZodError } from "zod";
import { cloudEnabled } from "@/lib/server/env";
import { getSession } from "@/lib/server/supabase";
import { fail, HttpError, ok, sameOrigin } from "@/lib/server/http";
import { handleOp } from "@/lib/server/ops";
import { GameError } from "@/lib/game/engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!cloudEnabled()) return fail("local_mode", 400);
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const session = await getSession();
  if (!session) return fail("unauthorized", 401);
  let body: { op?: unknown; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("invalid", 400);
  }
  if (typeof body.op !== "string") return fail("invalid", 400);
  try {
    const data = await handleOp(session, body.op, body.payload);
    return ok(data ?? {});
  } catch (e) {
    if (e instanceof GameError) return fail(e.code, 400);
    if (e instanceof HttpError) return fail(e.code, e.status);
    if (e instanceof ZodError) return fail("invalid", 400);
    console.error("rpc error", body.op, e instanceof Error ? e.message : e);
    return fail("error", 500);
  }
}
