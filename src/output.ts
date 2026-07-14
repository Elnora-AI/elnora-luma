import { LumaApiError } from "./client.js";

export function printResult(result: unknown, raw: boolean): void {
  if (result === null || result === undefined) {
    return;
  }
  const text = raw ? JSON.stringify(result) : JSON.stringify(result, null, 2);
  process.stdout.write(text + "\n");
}

export function printError(err: unknown): void {
  if (err instanceof LumaApiError) {
    process.stderr.write(`Luma API error: HTTP ${err.status} ${err.statusText} on ${err.method} ${err.path}\n`);
    if (err.body !== null && err.body !== undefined) {
      const formatted = typeof err.body === "string" ? err.body : JSON.stringify(err.body, null, 2);
      process.stderr.write(formatted + "\n");
    }
    return;
  }
  if (err instanceof Error) {
    process.stderr.write(`Error: ${err.message}\n`);
    return;
  }
  process.stderr.write(`Error: ${String(err)}\n`);
}
