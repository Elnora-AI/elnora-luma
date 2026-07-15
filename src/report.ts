/**
 * `luma report ...` and `luma stripe ...` — read-only reporting/automation
 * commands, hand-registered like admin.ts (NOT spec-driven; the bundled
 * openapi.json stays a byte-exact mirror of Luma's published spec).
 *
 * All commands here are Read-tier: they never mutate Luma or Stripe, never
 * email anyone, and are safe for unattended schedules. Delivery is composition:
 * write with --out (atomic) or pipe stdout to your own mail/upload step.
 */
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Command } from "commander";
import { callLuma } from "./client.js";
import { getApiKey } from "./dispatch.js";
import { toCsv } from "./csv.js";
import {
  ROSTER_COLUMNS,
  ROSTER_SCHEMA,
  buildCalendarSales,
  buildRosterRows,
  buildSalesSummary,
  computeWarnings,
  extractEntries,
  normalizeEventInfo,
  normalizeGuests,
  normalizeTicketTypes,
  renderCalendarSalesMd,
  renderSalesMd,
  type SalesSummary,
} from "./reporting.js";
import { diffIsEmpty, diffRosters, parseRosterDocument, renderDiffMd } from "./diff.js";
import {
  getStripeKey,
  listCharges,
  reconcile,
  reconcileHasAnomalies,
  renderReconcileMd,
} from "./stripe.js";

/** Exit code contract for scheduled use (documented in docs/automation.md):
 *  0 = clear, 1 = fatal error, 3 = warnings/anomalies found (with --check). */
export const EXIT_WARNINGS = 3;

/** Atomic write: temp file in the target directory, then rename. A crashed run
 *  never leaves a truncated artifact for the next scheduled consumer. */
export function writeOut(path: string, content: string): void {
  const tmp = join(dirname(path), `.${process.pid}-${Math.random().toString(36).slice(2)}.tmp`);
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, path);
}

function emit(content: string, out?: string): void {
  if (out) {
    writeOut(out, content);
    // Informational chatter is TTY-only so cron/CI runs stay silent on success
    // (cron MAILTO mails stderr too — a status line would mail every run).
    if (process.stderr.isTTY) process.stderr.write(`Wrote ${out}\n`);
  } else if (content !== "") {
    process.stdout.write(content);
  }
}

function jsonText(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

async function fetchAllEntries(
  apiKey: string,
  path: string,
  query: Record<string, string | number | undefined>,
): Promise<Record<string, unknown>[]> {
  const entries: Record<string, unknown>[] = [];
  let cursor: string | undefined;
  let pages = 0;
  do {
    const q: Record<string, string | number | string[]> = {};
    for (const [k, v] of Object.entries(query)) if (v !== undefined) q[k] = v;
    if (cursor) q.pagination_cursor = cursor;
    const resp = (await callLuma({ apiKey, method: "GET", path, query: q })) as {
      entries?: unknown[];
      has_more?: boolean;
      next_cursor?: string;
    };
    if (Array.isArray(resp)) return resp as Record<string, unknown>[];
    entries.push(...extractEntries(resp));
    cursor = resp?.has_more ? resp.next_cursor : undefined;
    pages += 1;
    if (pages > 1000) throw new Error("Pagination safety stop after 1000 pages");
  } while (cursor);
  return entries;
}

async function fetchEventSales(apiKey: string, eventId: string): Promise<{ summary: SalesSummary; rawEntries: Record<string, unknown>[] }> {
  const eventResp = await callLuma({ apiKey, method: "GET", path: "/v1/event/get", query: { id: eventId } });
  const event = normalizeEventInfo(eventResp);
  if (event.id === "") event.id = eventId;
  const ticketTypesResp = await callLuma({
    apiKey,
    method: "GET",
    path: "/v1/event/ticket-types/list",
    query: { event_id: eventId, include_hidden: "true" },
  });
  const rawEntries = await fetchAllEntries(apiKey, "/v1/event/get-guests", { event_id: eventId });
  const guests = normalizeGuests(rawEntries);
  return { summary: buildSalesSummary(event, normalizeTicketTypes(ticketTypesResp), guests, rawEntries), rawEntries };
}

interface CommonOpts {
  format?: string;
  out?: string;
}

function pickFormat(opts: CommonOpts, allowed: string[], fallback: string): string {
  const f = (opts.format ?? fallback).toLowerCase();
  if (!allowed.includes(f)) throw new Error(`--format must be one of: ${allowed.join(", ")}`);
  return f;
}

export function registerReportCommands(program: Command): void {
  const report = program
    .command("report")
    .description("Read-only reporting for accounting and unattended automation: sales, roster, diff, check");

  report
    .command("sales")
    .description("Revenue summary: per-currency captured totals, paid/free/uncaptured counts, ticket-type sales + capacity, coupon usage")
    .option("--event-id <evt>", "Event API ID, e.g. evt-XXXX")
    .option("--calendar", "All events on the calendar instead of one event (serial fetch, rate-limit aware)")
    .option("--after <iso>", "Calendar mode: only events starting at/after this ISO timestamp")
    .option("--before <iso>", "Calendar mode: only events starting before this ISO timestamp")
    .option("--format <fmt>", "json (default, machine) | md (human digest)")
    .option("--out <file>", "Write atomically to a file instead of stdout")
    .addHelpText("after", "\nRead-only. Amounts are integer cents as reported by Luma, bucketed per currency (never summed across currencies).\n")
    .action(async (opts: CommonOpts & { eventId?: string; calendar?: boolean; after?: string; before?: string }) => {
      const apiKey = getApiKey();
      const format = pickFormat(opts, ["json", "md"], "json");
      if (!opts.calendar) {
        if (!opts.eventId) throw new Error("Pass --event-id evt-XXXX, or --calendar for all events.");
        const { summary } = await fetchEventSales(apiKey, opts.eventId);
        emit(format === "md" ? renderSalesMd(summary) : jsonText(summary), opts.out);
        return;
      }
      const eventEntries = await fetchAllEntries(apiKey, "/v1/calendar/list-events", {
        after: opts.after,
        before: opts.before,
      });
      const summaries: SalesSummary[] = [];
      for (const entry of eventEntries) {
        const info = normalizeEventInfo(entry);
        if (info.id === "") continue;
        const { summary } = await fetchEventSales(apiKey, info.id);
        summaries.push(summary);
      }
      const calendar = buildCalendarSales({ after: opts.after ?? "", before: opts.before ?? "" }, summaries);
      emit(format === "md" ? renderCalendarSalesMd(calendar) : jsonText(calendar), opts.out);
    });

  report
    .command("roster")
    .description("Flat per-guest rows for accounting/CRM import (stable columns, deterministic order)")
    .requiredOption("--event-id <evt>", "Event API ID, e.g. evt-XXXX")
    .option("--status <status>", "Server-side approval_status filter: approved|invited|pending_approval|declined|waitlist|session")
    .option("--paid-only", "Only guests with captured payments (is_captured && amount > 0)")
    .option("--format <fmt>", "csv (default) | json (the input format for `report diff`)")
    .option("--out <file>", "Write atomically to a file instead of stdout")
    .action(async (opts: CommonOpts & { eventId: string; status?: string; paidOnly?: boolean }) => {
      const apiKey = getApiKey();
      const format = pickFormat(opts, ["csv", "json"], "csv");
      const eventResp = await callLuma({ apiKey, method: "GET", path: "/v1/event/get", query: { id: opts.eventId } });
      const event = normalizeEventInfo(eventResp);
      if (event.id === "") event.id = opts.eventId;
      const rawEntries = await fetchAllEntries(apiKey, "/v1/event/get-guests", {
        event_id: opts.eventId,
        approval_status: opts.status,
      });
      let rows = buildRosterRows(normalizeGuests(rawEntries));
      if (opts.paidOnly) rows = rows.filter((r) => r.payment === "paid");
      if (format === "json") {
        emit(jsonText({ schema: ROSTER_SCHEMA, event: { id: event.id, name: event.name }, rows }), opts.out);
      } else {
        emit(toCsv(ROSTER_COLUMNS as string[], rows.map((r) => ROSTER_COLUMNS.map((c) => r[c]))), opts.out);
      }
    });

  report
    .command("diff")
    .description("Change digest between two roster JSON files (no API calls, no state kept by the CLI)")
    .argument("<old.json>", "Earlier `report roster --format json` output")
    .argument("<new.json>", "Later `report roster --format json` output")
    .option("--format <fmt>", "md (default; prints NOTHING when unchanged — cron-mail friendly) | json")
    .option("--out <file>", "Write atomically to a file instead of stdout")
    .addHelpText(
      "after",
      "\nTypical scheduled use:\n  luma report roster --event-id evt-X --format json --out today.json\n  luma report diff yesterday.json today.json --format md | your-mail-command\n  mv today.json yesterday.json\n",
    )
    .action(async (oldPath: string, newPath: string, opts: CommonOpts) => {
      const format = pickFormat(opts, ["md", "json"], "md");
      const oldDoc = parseRosterDocument(JSON.parse(readFileSync(oldPath, "utf8")), oldPath);
      const newDoc = parseRosterDocument(JSON.parse(readFileSync(newPath, "utf8")), newPath);
      const diff = diffRosters(oldDoc, newDoc);
      if (format === "json") {
        emit(jsonText(diff), opts.out);
      } else {
        emit(renderDiffMd(diff), opts.out);
        if (diffIsEmpty(diff) && process.stderr.isTTY) process.stderr.write("No changes.\n");
      }
    });

  report
    .command("check")
    .description("Automation health check: capacity/sellout + approval-queue aging warnings. Exit 0 = clear, 3 = warnings")
    .requiredOption("--event-id <evt>", "Event API ID, e.g. evt-XXXX")
    .option("--warn-capacity-pct <n>", "Warn when a ticket type reaches this % of max_capacity", "90")
    .option("--warn-pending-hours <n>", "Warn when the oldest pending approval is older than this many hours", "24")
    .option("--format <fmt>", "md (default) | json")
    .option("--out <file>", "Write atomically to a file instead of stdout")
    .action(async (opts: CommonOpts & { eventId: string; warnCapacityPct: string; warnPendingHours: string }) => {
      const apiKey = getApiKey();
      const format = pickFormat(opts, ["md", "json"], "md");
      const { summary } = await fetchEventSales(apiKey, opts.eventId);
      const warnings = computeWarnings(
        summary,
        {
          capacityPct: Number(opts.warnCapacityPct),
          pendingHours: Number(opts.warnPendingHours),
          startSoonHours: 48,
        },
        Date.now(),
      );
      if (format === "json") {
        emit(jsonText({ schema: "elnora-luma/report-check@1", event: summary.event, warnings }), opts.out);
      } else if (warnings.length > 0) {
        emit(warnings.map((w) => `⚠ [${w.code}] ${w.message}`).join("\n") + "\n", opts.out);
      } else {
        // Clear run still refreshes --out (empty artifact = nothing to report).
        emit("", opts.out);
        if (process.stderr.isTTY) process.stderr.write(`OK — no warnings for ${summary.event.name || summary.event.id}.\n`);
      }
      if (warnings.length > 0) process.exitCode = EXIT_WARNINGS;
    });
}

export function registerStripeCommands(program: Command): void {
  const stripe = program
    .command("stripe")
    .description("Read-only Stripe cross-checks (organizer's own Stripe account; needs STRIPE_API_KEY, use a restricted rk_ key)");

  stripe
    .command("reconcile")
    .description("Match this event's Luma paid guests against Luma-originated charges in your Stripe account (email-keyed, read-only)")
    .requiredOption("--event-id <evt>", "Event API ID, e.g. evt-XXXX")
    .option("--since <iso>", "Only scan Stripe charges created at/after this ISO timestamp (default: the event's created_at)")
    .option("--check", "Exit 3 when anomalies are found (unmatched guests/charges, amount mismatches, refunds, truncation)")
    .option("--format <fmt>", "md (default) | json")
    .option("--out <file>", "Write atomically to a file instead of stdout")
    .addHelpText(
      "after",
      "\nLuma stamps `metadata.luma_payment_started_api_id` on charges it creates in your connected Stripe account (observed, undocumented). " +
        "Charges are account-wide: an unmatched charge may belong to another event — narrow with --since. Matching is by email only.\n",
    )
    .action(async (opts: CommonOpts & { eventId: string; since?: string; check?: boolean }) => {
      const apiKey = getApiKey();
      const stripeKey = getStripeKey();
      const format = pickFormat(opts, ["md", "json"], "md");

      const eventResp = await callLuma({ apiKey, method: "GET", path: "/v1/event/get", query: { id: opts.eventId } });
      const outer = (eventResp ?? {}) as Record<string, unknown>;
      const ev = (typeof outer.event === "object" && outer.event !== null ? outer.event : outer) as Record<string, unknown>;
      const event = normalizeEventInfo(eventResp);
      if (event.id === "") event.id = opts.eventId;

      let sinceIso = opts.since ?? (typeof ev.created_at === "string" ? ev.created_at : "");
      if (sinceIso === "" && event.start_at !== "") {
        const startMs = Date.parse(event.start_at);
        if (Number.isFinite(startMs)) sinceIso = new Date(startMs - 90 * 24 * 3_600_000).toISOString();
      }
      const sinceMs = Date.parse(sinceIso);
      if (!Number.isFinite(sinceMs)) {
        throw new Error("Could not derive a charge window — pass --since <iso>, e.g. --since 2030-01-01T00:00:00Z");
      }
      const sinceUnix = Math.floor(sinceMs / 1000);

      const rawEntries = await fetchAllEntries(apiKey, "/v1/event/get-guests", { event_id: opts.eventId });
      const guests = normalizeGuests(rawEntries);
      const { charges, truncated } = await listCharges(stripeKey, sinceUnix);
      const reportDoc = reconcile({ id: event.id, name: event.name }, guests, charges, sinceUnix, truncated);

      emit(format === "json" ? jsonText(reportDoc) : renderReconcileMd(reportDoc), opts.out);
      if (opts.check && reconcileHasAnomalies(reportDoc)) process.exitCode = EXIT_WARNINGS;
    });
}
