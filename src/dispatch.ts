import { readFileSync } from "node:fs";
import { callLuma } from "./client.js";
import { printResult } from "./output.js";
import type { Operation, ParamSpec } from "./spec.js";
import { snakeToCamel } from "./spec.js";

interface CmdOpts {
  body?: string;
  raw?: boolean;
  all?: boolean;
  search?: string;
  [k: string]: unknown;
}

function readFileOrStdin(arg: string): string {
  if (arg === "-") return readFileSync(0, "utf8");
  if (arg.startsWith("@")) return readFileSync(arg.slice(1), "utf8");
  return arg;
}

function readBodyArg(arg: string): unknown {
  const raw = readFileOrStdin(arg);
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`--body is not valid JSON: ${(err as Error).message}`);
  }
}

export function getApiKey(): string {
  const key = process.env.LUMA_API_KEY;
  if (!key || key === "your-luma-api-key") {
    throw new Error(
      "LUMA_API_KEY is not set. Generate a calendar API key at https://luma.com/calendar/manage/api-keys " +
        "(requires Luma Plus), then run `luma auth set-key <key>` or export LUMA_API_KEY.",
    );
  }
  return key;
}

export function coerceValue(prop: ParamSpec, value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  switch (prop.type) {
    case "number":
    case "integer": {
      const n = Number(value);
      if (Number.isNaN(n)) throw new Error(`--${prop.name.replace(/_/g, "-")} expects a number, got: ${value}`);
      return n;
    }
    case "boolean":
      if (typeof value === "boolean") return value;
      if (value === "true") return true;
      if (value === "false") return false;
      throw new Error(`--${prop.name.replace(/_/g, "-")} expects true/false`);
    case "array": {
      // commander returns the last value for repeated options unless configured otherwise.
      // JSON arrays ('["a","b"]', @file, or -) pass through verbatim — required for arrays
      // of objects like send-invites --guests. Comma-separated strings are a convenience.
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        const expanded = readFileOrStdin(value).trim();
        if (expanded.startsWith("[")) {
          try {
            return JSON.parse(expanded);
          } catch (err) {
            throw new Error(
              `--${prop.name.replace(/_/g, "-")} expects a JSON array or a comma-separated list.\n` +
              `Parse error: ${(err as Error).message}\n` +
              `Hint: wrap the value in single quotes and use double quotes inside, e.g. --${prop.name.replace(/_/g, "-")} '["a","b"]'`,
            );
          }
        }
        return expanded.includes(",") ? expanded.split(",").map((s) => s.trim()) : [expanded];
      }
      return [value];
    }
    case "json":
      if (typeof value === "string") {
        const expanded = readFileOrStdin(value);
        try {
          return JSON.parse(expanded);
        } catch (err) {
          throw new Error(
            `--${prop.name.replace(/_/g, "-")} expects valid JSON, got: ${expanded.slice(0, 120)}\n` +
            `Parse error: ${(err as Error).message}\n` +
            `Hint: wrap the value in single quotes and ensure inner strings use double quotes, e.g. --${prop.name.replace(/_/g, "-")} '{"key":"value"}'`,
          );
        }
      }
      return value;
    default:
      if (typeof value === "string") return readFileOrStdin(value);
      return value;
  }
}

function pickValuesFromOpts(props: ParamSpec[], opts: CmdOpts): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of props) {
    const camelKey = snakeToCamel(p.name);
    const raw = (opts as Record<string, unknown>)[camelKey];
    if (raw === undefined || raw === null || raw === "") continue;
    const coerced = coerceValue(p, raw);
    if (coerced !== undefined) out[p.name] = coerced;
  }
  return out;
}

function matchesSearch(entry: Record<string, unknown>, term: string): boolean {
  const lower = term.toLowerCase();
  for (const v of Object.values(entry)) {
    if (typeof v === "string" && v.toLowerCase().includes(lower)) return true;
  }
  return false;
}

function filterEntries(entries: unknown[], search: string): unknown[] {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter((e) => {
    const rec = e as Record<string, unknown>;
    return terms.every((t) => matchesSearch(rec, t));
  });
}

export async function dispatch(op: Operation, opts: CmdOpts): Promise<void> {
  const apiKey = getApiKey();

  const query = op.method === "GET" ? pickValuesFromOpts(op.params, opts) as Record<string, string | number | string[]> : undefined;

  let body: unknown = undefined;
  if (op.method !== "GET") {
    if (opts.body !== undefined) {
      body = readBodyArg(opts.body);
    } else {
      const fromFlags = pickValuesFromOpts(op.bodyProps, opts);
      if (Object.keys(fromFlags).length > 0) body = fromFlags;
    }
  }

  // Auto-paginate when --all and the response shape looks paginated.
  if (opts.all && op.method === "GET") {
    const allEntries: unknown[] = [];
    let cursor: string | undefined;
    let pageCount = 0;
    do {
      const q: Record<string, string | number | string[]> = { ...(query || {}) };
      if (cursor) q["pagination_cursor"] = cursor;
      const resp = (await callLuma({ apiKey, method: op.method, path: op.path, query: q })) as any;
      if (Array.isArray(resp?.entries)) {
        allEntries.push(...resp.entries);
        cursor = resp.has_more ? resp.next_cursor : undefined;
      } else {
        // Not paginated — fall through.
        printResult(resp, !!opts.raw);
        return;
      }
      pageCount += 1;
      if (pageCount > 1000) throw new Error("Pagination safety stop after 1000 pages");
    } while (cursor);
    const filtered = opts.search ? filterEntries(allEntries, opts.search) : allEntries;
    printResult({ entries: filtered, has_more: false, total: filtered.length }, !!opts.raw);
    return;
  }

  const result = await callLuma({ apiKey, method: op.method, path: op.path, query, body });

  if (opts.search && result && typeof result === "object" && Array.isArray((result as any).entries)) {
    const r = result as any;
    const filtered = filterEntries(r.entries, opts.search);
    printResult({ ...r, entries: filtered, total: filtered.length }, !!opts.raw);
    return;
  }

  printResult(result, !!opts.raw);
}
