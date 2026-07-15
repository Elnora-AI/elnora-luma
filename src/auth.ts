/**
 * `luma auth` — first-run credential setup and status.
 *
 * `auth set-key` writes LUMA_API_KEY (and optionally LUMA_AUTH_SESSION_KEY) to
 * the user config file with 0600 permissions. `auth status` reports where each
 * credential resolved from (masked) and verifies the key against the API.
 */
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "commander";
import { callLuma } from "./client.js";
import { configDir, envSources } from "./env.js";
import { printResult } from "./output.js";

const KEY_URL = "https://luma.com/calendar/manage/api-keys";

function mask(value: string): string {
  return value.length <= 4 ? "****" : `****${value.slice(-4)}`;
}

function upsertEnvFile(filePath: string, updates: Record<string, string>): void {
  // Read-with-catch instead of exists-then-read: no TOCTOU window.
  let existing = "";
  try {
    existing = readFileSync(filePath, "utf8");
  } catch {
    // File doesn't exist yet — start fresh.
  }
  const lines = existing ? existing.split("\n") : [];
  const pending = { ...updates };
  const out = lines.map((line) => {
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) return line;
    const key = line.slice(0, eqIndex).trim();
    if (key in pending) {
      const replaced = `${key}=${pending[key]}`;
      delete pending[key];
      return replaced;
    }
    return line;
  });
  for (const [key, value] of Object.entries(pending)) out.push(`${key}=${value}`);
  // mode applies at creation so the key is never world-readable, even briefly;
  // chmod fixes up files that already existed with looser permissions.
  writeFileSync(filePath, `${out.filter((l, i) => l !== "" || i < out.length - 1).join("\n").replace(/\n+$/, "")}\n`, { mode: 0o600 });
  chmodSync(filePath, 0o600);
}

export function registerAuthCommands(program: Command): void {
  const auth = program.command("auth").description("Credential setup and status");

  auth
    .command("set-key")
    .description(`Save LUMA_API_KEY to ${join(configDir(), ".env")} (created with 0600 permissions)`)
    .argument("<api-key>", `Luma API key — generate at ${KEY_URL} (requires Luma Plus)`)
    .option("--session-key <value>", "Also store LUMA_AUTH_SESSION_KEY (only needed for `event` admin commands; it expires)")
    .option("--stripe-key <value>", "Also store STRIPE_API_KEY (only needed for `stripe reconcile`; use a RESTRICTED read-only rk_ key)")
    .action((apiKey: string, opts: { sessionKey?: string; stripeKey?: string }) => {
      const key = apiKey.trim();
      if (!key) throw new Error("API key is empty.");
      const dir = configDir();
      mkdirSync(dir, { recursive: true });
      const filePath = join(dir, ".env");
      const updates: Record<string, string> = { LUMA_API_KEY: key };
      if (opts.sessionKey?.trim()) updates.LUMA_AUTH_SESSION_KEY = opts.sessionKey.trim();
      if (opts.stripeKey?.trim()) updates.STRIPE_API_KEY = opts.stripeKey.trim();
      upsertEnvFile(filePath, updates);
      process.stderr.write(`Saved LUMA_API_KEY (${mask(key)}) to ${filePath}\n`);
      process.stderr.write("Verify with: luma auth status\n");
    });

  auth
    .command("status")
    .description("Show where credentials resolved from and verify the API key against Luma")
    .option("--raw", "Compact JSON output")
    .action(async (opts: { raw?: boolean }) => {
      const key = process.env.LUMA_API_KEY;
      const session = process.env.LUMA_AUTH_SESSION_KEY;
      if (!key || key === "your-luma-api-key") {
        process.stderr.write(
          `LUMA_API_KEY is not set.\nGenerate a key at ${KEY_URL} (requires Luma Plus), then run:\n  luma auth set-key <key>\n`,
        );
        process.exit(1);
      }
      process.stderr.write(`LUMA_API_KEY: ${mask(key)} (source: ${envSources.LUMA_API_KEY ?? "environment"})\n`);
      process.stderr.write(
        session
          ? `LUMA_AUTH_SESSION_KEY: ${mask(session)} (source: ${envSources.LUMA_AUTH_SESSION_KEY ?? "environment"})\n`
          : "LUMA_AUTH_SESSION_KEY: not set (only needed for `event` admin commands)\n",
      );
      const stripe = process.env.STRIPE_API_KEY;
      process.stderr.write(
        stripe
          ? `STRIPE_API_KEY: ${mask(stripe)} (source: ${envSources.STRIPE_API_KEY ?? "environment"})${stripe.startsWith("rk_") ? "" : " ⚠ not a restricted rk_ key — reconcile only needs read access"}\n`
          : "STRIPE_API_KEY: not set (only needed for `stripe reconcile`)\n",
      );
      const me = await callLuma({ apiKey: key, method: "GET", path: "/v1/user/get-self" });
      printResult(me, !!opts.raw);
    });
}
