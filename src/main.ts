/**
 * Luma CLI — thin wrapper over public-api.luma.com.
 * All commands are registered dynamically from src/spec/openapi.json.
 */
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { buildResourceMap, type Operation, type ParamSpec, snakeToKebab } from "./spec.js";
import { dispatch } from "./dispatch.js";
import { printError } from "./output.js";
import { refreshSpec } from "./client.js";
import { registerAdminCommands } from "./admin.js";
import { registerAuthCommands } from "./auth.js";
import { loadEnv } from "./env.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = resolve(__dirname, "spec", "openapi.json");
const SRC_SPEC_PATH = resolve(__dirname, "..", "src", "spec", "openapi.json");
const PKG_PATH = resolve(__dirname, "..", "package.json");
const pkg = JSON.parse(readFileSync(PKG_PATH, "utf8")) as { version: string };

function describeParam(p: ParamSpec): string {
  const bits: string[] = [];
  if (p.required) bits.push("(required)");
  if (p.description) bits.push(p.description.replace(/\s+/g, " ").trim());
  if (p.enumValues && p.enumValues.length > 0 && p.enumValues.length < 10) {
    bits.push(`one of: ${p.enumValues.join("|")}`);
  }
  return bits.join(" ").slice(0, 250);
}

// Operation-specific warnings shown on --help and printed to stderr on every invocation.
// Derived from a real mass-comp/mass-email incident — see `skills/luma/SKILL.md`.
const HAZARD_WARNINGS: Record<string, string> = {
  "event.add-guests":
    "⚠ HAZARD: `add-guests` is the COMP-VIP endpoint. It bypasses BOTH payment and approval. Every guest is added with status 'Going' and a comped ticket of the default (lowest position) ticket type. To 'invite' people who should pay or be approved, share the public event URL or use `send-invites` instead. See `luma:guests` SKILL.",
  "event.send-invites":
    "⚠ EMAIL: `send-invites` sends Luma-branded invite emails. Recipients are auto-approved (bypasses approval queue) but DO have to pay on paid tickets. Confirm recipient list + intent with the user before sending.",
  "event.update-guest-status":
    "⚠ EMAIL: `update-guest-status` fires an email to the guest on both `approved` and `declined`. Always test on ONE address the user controls first; verify email behavior; then batch SERIAL with ≥1.2s sleeps (parallel >2 trips 429 fast). Rate limit: 200 req/min.",
  "event.ticket-types-delete":
    "⚠ HAZARD: Deleting a ticket type orphans pre-assignments of any `invited` guests who had it as their default ticket. It also fails if the event would be left with zero VISIBLE ticket types (Luma 400). Confirm intent + read `luma:ticketing` SKILL before proceeding.",
  "event.cancel":
    "⚠ EMAIL: Cancelling fires a notification to every approved guest. Confirm `--should-refund` decision first if paid_guest_count > 0.",
  "event.update-coupon":
    "⚠ SILENT: coupon discount terms are immutable after creation. Passing a new `discount` returns HTTP 200 `{}` and changes NOTHING — no error. Only code, remaining_count, and validity dates can change. To change the discount: retire the old code (remaining_count: 0) and create a new one. See `luma:ticketing` SKILL.",
  "calendar.coupons-update":
    "⚠ SILENT: coupon discount terms are immutable after creation. Passing a new `discount` returns HTTP 200 `{}` and changes NOTHING — no error. Only code, remaining_count, and validity dates can change. To change the discount: retire the old code (remaining_count: 0) and create a new one. See `luma:ticketing` SKILL.",
};

function hazardKey(op: Operation): string {
  // op.action is the action name like "add-guests"; we need the resource context too.
  // Resource is the first path segment after /v1/. Use op.path to derive a stable key.
  const m = op.path.match(/^\/v1\/([^/]+)/);
  return `${m?.[1] ?? ""}.${op.action}`;
}

function registerOperation(parent: Command, op: Operation): void {
  const sub = parent
    .command(op.action)
    .description(`${op.method} ${op.path}${op.summary ? ` — ${op.summary}` : ""}`);

  // Query params (GET only)
  for (const p of op.params) {
    const flag = `--${snakeToKebab(p.name)} <${p.type}>`;
    sub.option(flag, describeParam(p));
  }
  // Body props (POST only) — top-level flat properties
  if (op.method !== "GET") {
    for (const bp of op.bodyProps) {
      const flag = `--${snakeToKebab(bp.name)} <${bp.type}>`;
      sub.option(flag, describeParam(bp));
    }
    sub.option(
      "--body <json>",
      "JSON request body. Pass literal JSON, @file.json, or - to read stdin. Required when the body has nested objects/arrays.",
    );
  }
  sub.option("--all", "Auto-paginate list responses by following has_more / next_cursor");
  sub.option("--search <term>", "Client-side filter: keep entries where any string field contains the term (space-separated terms are AND-matched)");
  sub.option("--raw", "One-line compact JSON instead of pretty-printed");

  const hazard = HAZARD_WARNINGS[hazardKey(op)];
  if (hazard) {
    sub.addHelpText("after", `\n${hazard}\n`);
  }

  sub.action(async (opts: Record<string, unknown>) => {
    if (hazard) {
      // Print to stderr so the warning is visible even when an agent only consumes stdout.
      process.stderr.write(`${hazard}\n`);
    }
    await dispatch(op, opts);
  });
}

async function main(): Promise<void> {
  loadEnv();
  const program = new Command();
  program
    .name("luma")
    .version(pkg.version)
    .description(
      `Luma API CLI — covers every endpoint from public-api.luma.com.

Auth: LUMA_API_KEY from the environment, ~/.config/elnora-luma/.env, or a .env next to the CLI.
First run: \`luma auth set-key <key>\` (generate a key at https://luma.com/calendar/manage/api-keys — requires Luma Plus).
Each key is scoped to a single calendar.

Resources are discovered dynamically from the bundled OpenAPI spec. Run \`luma <resource>\` to list its actions, or \`luma <resource> <action> --help\` for the full flag list.`,
    );

  // Convenience aliases
  program
    .command("whoami")
    .description("Show the authenticated user (alias for `luma user get-self`)")
    .option("--raw", "Compact JSON output")
    .action(async (opts: Record<string, unknown>) => {
      await dispatch(
        {
          resource: "user",
          action: "get-self",
          method: "GET",
          path: "/v1/user/get-self",
          params: [],
          bodyProps: [],
        },
        opts,
      );
    });

  // Credential setup
  registerAuthCommands(program);

  // Spec management
  const specGroup = program.command("spec").description("OpenAPI spec utilities");
  specGroup
    .command("refresh")
    .description("Re-download the bundled openapi.json from public-api.luma.com")
    .action(async () => {
      await refreshSpec(SPEC_PATH);
      // Also update the source-of-truth copy so the change survives `npm run build`.
      try {
        await refreshSpec(SRC_SPEC_PATH);
        process.stderr.write(`Refreshed ${SPEC_PATH}\n           and ${SRC_SPEC_PATH}\n`);
      } catch {
        process.stderr.write(`Refreshed ${SPEC_PATH} (could not update src/ — fine if running from a production install)\n`);
      }
    });
  specGroup
    .command("path")
    .description("Print the local path to the bundled openapi.json")
    .action(() => {
      process.stdout.write(SPEC_PATH + "\n");
    });

  // Dynamic resource commands
  const resourceMap = buildResourceMap(SPEC_PATH);
  const sortedResources = Array.from(resourceMap.keys()).sort();
  for (const resource of sortedResources) {
    const operations = resourceMap.get(resource)!;
    const group = program
      .command(resource)
      .description(`${operations.length} actions: ${operations.map((o) => o.action).join(", ")}`);
    for (const op of operations) {
      registerOperation(group, op);
    }
  }

  // Admin-API commands — not in the public OpenAPI spec; hand-registered onto the
  // `event` group. These hit api.luma.com with cookie-session auth. See src/admin.ts.
  const eventGroup = program.commands.find((c) => c.name() === "event");
  if (eventGroup) registerAdminCommands(eventGroup);

  // Help footer
  program.addHelpText(
    "after",
    `
Examples:
  luma whoami                                       # who is this API key?
  luma calendar get                                 # current calendar
  luma calendar list-events                         # list events on the calendar
  luma calendar list-events --all                   # auto-paginate
  luma event get --api-id evt-XXXX                  # event detail
  luma event get-guests --event-api-id evt-XXXX     # guest list
  luma event add-guests --body @guests.json         # complex body from file
  echo '{"event_id":"evt-X","guests":[...]}' | luma event add-guests --body -
  luma webhooks list
  luma spec refresh                                 # update the bundled OpenAPI spec
`,
  );

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  printError(err);
  process.exit(1);
});
