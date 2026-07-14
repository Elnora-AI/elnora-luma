/**
 * Credential resolution — mirrors the elnora-slack env chain:
 *   1. LUMA_API_KEY / LUMA_AUTH_SESSION_KEY from the process environment
 *   2. $LUMA_CONFIG_DIR/.env (default ~/.config/elnora-luma/.env)
 *   3. .env next to the installed CLI (repo/plugin root, dev convenience)
 *
 * .env files are parsed with a strict 2-key allowlist; nothing outside the
 * config directory or the CLI's own folder is ever read. No credentials leave
 * the machine except to Luma's own API hosts (see src/client.ts).
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_ENV_KEYS = new Set(["LUMA_API_KEY", "LUMA_AUTH_SESSION_KEY"]);

/** Where each allowed key was resolved from ("environment" or a file path). */
export const envSources: Record<string, string> = {};

/** User config dir: $LUMA_CONFIG_DIR overrides, else ~/.config/elnora-luma. */
export function configDir(): string {
  const override = process.env.LUMA_CONFIG_DIR?.trim();
  if (override) return override;
  return join(homedir(), ".config", "elnora-luma");
}

function parseEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    if (!ALLOWED_ENV_KEYS.has(key)) continue;
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // Environment always wins over files; earlier files win over later ones.
    if (!(key in process.env) || process.env[key] === undefined) {
      if (value !== "") {
        process.env[key] = value;
        envSources[key] = filePath;
      }
    }
  }
}

export function loadEnv(): void {
  for (const key of ALLOWED_ENV_KEYS) {
    if (process.env[key]) envSources[key] = "environment";
  }
  parseEnvFile(join(configDir(), ".env"));
  // .env at the plugin/repo root (next to dist/, where the bundle lives).
  const bundleDir = dirname(fileURLToPath(import.meta.url));
  parseEnvFile(resolve(bundleDir, "..", ".env"));
}
