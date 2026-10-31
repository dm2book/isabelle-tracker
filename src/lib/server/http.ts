import "server-only";
import { NextResponse } from "next/server";

const NO_STORE = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };

export function ok<T>(data: T, init?: { status?: number }) {
  return NextResponse.json({ ok: true, data }, { status: init?.status ?? 200, headers: NO_STORE });
}

export function fail(code: string, status = 400, message?: string) {
  return NextResponse.json({ ok: false, error: { code, message: message ?? code } }, { status, headers: NO_STORE });
}

export class HttpError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

/** Reject cross-site POSTs (defense in depth on top of SameSite cookies). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
