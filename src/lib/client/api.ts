"use client";

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

async function parse<T>(res: Response): Promise<T> {
  let body: { ok?: boolean; data?: T; error?: { code: string; message: string } } = {};
  try {
    body = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok || body.ok === false) {
    throw new ApiError(body.error?.code ?? `http_${res.status}`, body.error?.message ?? res.statusText, res.status);
  }
  return body.data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", cache: "no-store" });
  } catch {
    throw new ApiError("network", "network", 0);
  }
  return parse<T>(res);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("network", "network", 0);
  }
  return parse<T>(res);
}

export const rpc = <T,>(op: string, payload: unknown = {}) => apiPost<T>("/api/rpc", { op, payload });
