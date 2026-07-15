import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Command } from "commander";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerReportCommands, registerStripeCommands, writeOut } from "../src/report.js";
import { ROSTER_SCHEMA } from "../src/reporting.js";
import { eventResponse, guestsPage1, guestsPage2, mkResponse, ticketTypesResponse } from "./fixtures.js";

function program(): Command {
  const p = new Command();
  p.exitOverride();
  registerReportCommands(p);
  registerStripeCommands(p);
  return p;
}

let stdout: string[];
let tmp: string;

beforeEach(() => {
  stdout = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  process.env.LUMA_API_KEY = "test-luma-key";
  process.env.STRIPE_API_KEY = "rk_test_key";
  tmp = mkdtempSync(join(tmpdir(), "luma-report-test-"));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  rmSync(tmp, { recursive: true, force: true });
  process.exitCode = 0;
});

/** fetch stub that dispatches on URL path and records every request. */
function stubLumaFetch(): { requests: URL[] } {
  const requests: URL[] = [];
  vi.stubGlobal("fetch", async (url: URL | string) => {
    const u = new URL(String(url));
    requests.push(u);
    if (u.pathname === "/v1/event/get") return mkResponse(eventResponse);
    if (u.pathname === "/v1/event/ticket-types/list") return mkResponse(ticketTypesResponse);
    if (u.pathname === "/v1/event/get-guests") {
      return mkResponse(u.searchParams.get("pagination_cursor") === "cursor-2" ? guestsPage2 : guestsPage1);
    }
    if (u.pathname === "/v1/charges") return mkResponse({ data: [], has_more: false });
    throw new Error(`unexpected fetch: ${u.pathname}`);
  });
  return { requests };
}

describe("report command wiring", () => {
  it("registers the report and stripe groups with their subcommands", () => {
    const p = program();
    const report = p.commands.find((c) => c.name() === "report")!;
    expect(report.commands.map((c) => c.name()).sort()).toEqual(["check", "diff", "roster", "sales"]);
    const stripe = p.commands.find((c) => c.name() === "stripe")!;
    expect(stripe.commands.map((c) => c.name())).toEqual(["reconcile"]);
  });

  it("report sales paginates guests and emits a deterministic summary", async () => {
    const { requests } = stubLumaFetch();
    await program().parseAsync(["node", "luma", "report", "sales", "--event-id", "evt-1"]);
    const guestCalls = requests.filter((u) => u.pathname === "/v1/event/get-guests");
    expect(guestCalls).toHaveLength(2);
    expect(guestCalls[0].searchParams.get("x-unused")).toBeNull();
    expect(guestCalls[1].searchParams.get("pagination_cursor")).toBe("cursor-2");
    expect(requests.find((u) => u.pathname === "/v1/event/ticket-types/list")!.searchParams.get("include_hidden")).toBe("true");
    const summary = JSON.parse(stdout.join(""));
    expect(summary.schema).toBe("elnora-luma/report-sales@1");
    expect(summary.guests.total).toBe(6);
    expect(summary.revenue.find((b: { currency: string }) => b.currency === "eur").gross_cents).toBe(4000);
    // Luma API key travels in the header, never in the URL
    expect(requests.every((u) => !String(u).includes("test-luma-key"))).toBe(true);
  });

  it("report roster writes CSV atomically via --out", async () => {
    stubLumaFetch();
    const out = join(tmp, "roster.csv");
    await program().parseAsync(["node", "luma", "report", "roster", "--event-id", "evt-1", "--out", out]);
    const csv = readFileSync(out, "utf8");
    expect(csv.split("\n")[0]).toContain("name,first_name,last_name,email");
    expect(csv).toContain("paid@example.com");
    expect(csv).toContain("SAVE20");
    expect(stdout.join("")).toBe(""); // --out means nothing on stdout
  });

  it("report diff exits quietly on identical files and rejects non-roster input", async () => {
    stubLumaFetch();
    const rosterOut = join(tmp, "r.json");
    await program().parseAsync(["node", "luma", "report", "roster", "--event-id", "evt-1", "--format", "json", "--out", rosterOut]);
    stdout.length = 0;
    await program().parseAsync(["node", "luma", "report", "diff", rosterOut, rosterOut]);
    expect(stdout.join("")).toBe("");

    const bad = join(tmp, "bad.json");
    writeFileSync(bad, JSON.stringify({ nope: 1 }));
    await expect(program().parseAsync(["node", "luma", "report", "diff", bad, rosterOut])).rejects.toThrow(/not a roster document/);
  });

  it("report check sets exit code 3 when warnings fire", async () => {
    stubLumaFetch();
    // tt-paid sells 4/100 seats in the fixtures (multi holds 2 tickets) → a 4% threshold trips near_capacity
    await program().parseAsync(["node", "luma", "report", "check", "--event-id", "evt-1", "--warn-capacity-pct", "4"]);
    expect(process.exitCode).toBe(3);
  });

  it("report check --out is refreshed (truncated) on a clear run", async () => {
    stubLumaFetch();
    const out = join(tmp, "check.md");
    writeFileSync(out, "stale warnings from yesterday\n");
    await program().parseAsync(["node", "luma", "report", "check", "--event-id", "evt-1", "--out", out]);
    expect(process.exitCode).toBe(0);
    expect(readFileSync(out, "utf8")).toBe("");
  });

  it("stripe reconcile runs end-to-end with an empty charge list", async () => {
    const { requests } = stubLumaFetch();
    await program().parseAsync(["node", "luma", "stripe", "reconcile", "--event-id", "evt-1", "--format", "json"]);
    const chargeCall = requests.find((u) => u.pathname === "/v1/charges")!;
    // default --since = event created_at (2030-01-01)
    expect(chargeCall.searchParams.get("created[gte]")).toBe(String(Math.floor(Date.parse("2030-01-01T00:00:00.000Z") / 1000)));
    const doc = JSON.parse(stdout.join(""));
    expect(doc.schema).toBe("elnora-luma/stripe-reconcile@1");
    expect(doc.luma_paid_no_charge.length).toBeGreaterThan(0);
  });

  it("roster JSON round-trips through the documented schema", async () => {
    stubLumaFetch();
    await program().parseAsync(["node", "luma", "report", "roster", "--event-id", "evt-1", "--format", "json"]);
    const doc = JSON.parse(stdout.join(""));
    expect(doc.schema).toBe(ROSTER_SCHEMA);
    expect(doc.event).toEqual({ id: "evt-1", name: "Test Conference" });
  });
});

describe("writeOut", () => {
  it("replaces the destination atomically (no partial file on rewrite)", () => {
    const dest = join(tmp, "artifact.json");
    writeOut(dest, "first\n");
    writeOut(dest, "second\n");
    expect(readFileSync(dest, "utf8")).toBe("second\n");
  });
});
