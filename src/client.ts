import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export const BASE_URL = "https://public-api.luma.com";
// Luma's internal admin API. NOT the public API — different host, cookie-session auth.
// A handful of host-only operations (e.g. setting a guest's display name) exist only here.
export const ADMIN_BASE_URL = "https://api.luma.com";

const PKG_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const { version: PKG_VERSION } = JSON.parse(readFileSync(PKG_PATH, "utf8")) as { version: string };
const USER_AGENT = `elnora-luma-cli/${PKG_VERSION}`;

export class LumaApiError extends Error {
  constructor(public status: number, public statusText: string, public body: unknown, public method: string, public path: string) {
    super(`Luma API ${method} ${path} → HTTP ${status} ${statusText}`);
  }
}

interface CallOptions {
  apiKey: string;
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string | number | string[] | undefined>;
  body?: unknown;
}

const MAX_RETRIES = 3;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export async function callLuma(opts: CallOptions): Promise<unknown> {
  const url = new URL(BASE_URL + opts.path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }
  }
  const headers: Record<string, string> = {
    "x-luma-api-key": opts.apiKey,
    accept: "application/json",
    "user-agent": USER_AGENT,
  };
  const init: RequestInit = { method: opts.method, headers };
  if (opts.body !== undefined && opts.method !== "GET") {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  }

  let lastResp: Response | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const resp = await fetch(url, init);
    lastResp = resp;
    if (RETRYABLE.has(resp.status) && attempt < MAX_RETRIES - 1) {
      const retryAfter = Number(resp.headers.get("retry-after") || "");
      const backoffMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 10_000)
        : Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise((r) => setTimeout(r, backoffMs));
      continue;
    }
    const text = await resp.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    if (!resp.ok) {
      throw new LumaApiError(resp.status, resp.statusText, parsed, opts.method, opts.path);
    }
    return parsed;
  }
  throw new LumaApiError(lastResp?.status ?? 0, lastResp?.statusText ?? "exhausted retries", null, opts.method, opts.path);
}

interface AdminCallOptions {
  sessionKey: string;
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

// Call Luma's internal admin API (api.luma.com) with cookie-session auth.
// `sessionKey` is the value of the `luma.auth-session-key` cookie from a logged-in
// host's browser session — it expires, unlike the public API key. Single attempt, no retry.
export async function callLumaAdmin(opts: AdminCallOptions): Promise<unknown> {
  const url = new URL(ADMIN_BASE_URL + opts.path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  const headers: Record<string, string> = {
    cookie: `luma.auth-session-key=${opts.sessionKey}`,
    accept: "application/json",
    "user-agent": USER_AGENT,
    "x-luma-client-type": "luma-web",
    origin: "https://luma.com",
    referer: "https://luma.com/",
  };
  const init: RequestInit = { method: opts.method, headers };
  if (opts.body !== undefined && opts.method !== "GET") {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  }
  const resp = await fetch(url, init);
  const text = await resp.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!resp.ok) {
    throw new LumaApiError(resp.status, resp.statusText, parsed, opts.method, opts.path);
  }
  return parsed;
}

export async function refreshSpec(targetPath: string): Promise<void> {
  const resp = await fetch(BASE_URL + "/openapi.json");
  if (!resp.ok) {
    throw new Error(`Failed to fetch openapi.json: HTTP ${resp.status} ${resp.statusText}`);
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  writeFileSync(targetPath, buf);
}
