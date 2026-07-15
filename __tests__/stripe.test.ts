import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeGuests } from "../src/reporting.js";
import {
  STRIPE_BASE_URL,
  callStripe,
  chargeEmail,
  isLumaCharge,
  listCharges,
  reconcile,
  reconcileHasAnomalies,
  renderReconcileMd,
  type StripeCharge,
} from "../src/stripe.js";
import { mkResponse, multiCurrencyGuest, paidGuest, uncapturedGuest } from "./fixtures.js";

const charge = (over: Partial<StripeCharge>): StripeCharge => ({
  id: "ch_1",
  amount: 4000,
  amount_refunded: 0,
  currency: "eur",
  status: "succeeded",
  paid: true,
  refunded: false,
  created: 1900000000,
  receipt_email: null,
  billing_details: null,
  metadata: { luma_payment_started_api_id: "pay-1", email: "paid@example.com" },
  ...over,
});

afterEach(() => vi.unstubAllGlobals());

describe("callStripe / listCharges", () => {
  it("pins the host, sends Bearer auth, and only ever GETs", async () => {
    const seen: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: URL | string, init: RequestInit) => {
      seen.push({ url: String(url), init });
      return mkResponse({ data: [], has_more: false });
    }) as unknown as typeof fetch;
    await callStripe({ apiKey: "rk_test_123", path: "/v1/charges", query: { limit: 100, "created[gte]": 42 }, fetchImpl });
    expect(seen).toHaveLength(1);
    const u = new URL(seen[0].url);
    expect(u.origin).toBe(STRIPE_BASE_URL);
    expect(u.searchParams.get("created[gte]")).toBe("42");
    expect(seen[0].init.method).toBe("GET");
    expect((seen[0].init.headers as Record<string, string>).authorization).toBe("Bearer rk_test_123");
  });

  it("throws a typed error on non-2xx", async () => {
    const fetchImpl = (async () => mkResponse({ error: { message: "nope" } }, 401)) as unknown as typeof fetch;
    await expect(callStripe({ apiKey: "rk_x", path: "/v1/charges", fetchImpl })).rejects.toThrow(/HTTP 401/);
  });

  it("follows starting_after cursors and reports truncation at the page cap", async () => {
    let calls = 0;
    const twoPages = (async (url: URL | string) => {
      calls += 1;
      const u = new URL(String(url));
      if (!u.searchParams.get("starting_after")) {
        return mkResponse({ data: [charge({ id: "ch_a" })], has_more: true });
      }
      expect(u.searchParams.get("starting_after")).toBe("ch_a");
      return mkResponse({ data: [charge({ id: "ch_b" })], has_more: false });
    }) as unknown as typeof fetch;
    const result = await listCharges("rk_x", 0, twoPages);
    expect(calls).toBe(2);
    expect(result.charges.map((c) => c.id)).toEqual(["ch_a", "ch_b"]);
    expect(result.truncated).toBe(false);

    let n = 0;
    const endless = (async () => mkResponse({ data: [charge({ id: `ch_${n++}` })], has_more: true })) as unknown as typeof fetch;
    const capped = await listCharges("rk_x", 0, endless);
    expect(capped.truncated).toBe(true);
    expect(capped.charges).toHaveLength(50);
  });
});

describe("charge helpers", () => {
  it("coalesces email: metadata → receipt_email → billing_details", () => {
    expect(chargeEmail(charge({}))).toBe("paid@example.com");
    expect(chargeEmail(charge({ metadata: { luma_payment_started_api_id: "p" }, receipt_email: " R@X.com" }))).toBe("r@x.com");
    expect(
      chargeEmail(charge({ metadata: { luma_payment_started_api_id: "p" }, receipt_email: null, billing_details: { email: "B@Y.com" } })),
    ).toBe("b@y.com");
  });

  it("identifies Luma-originated charges by the metadata stamp", () => {
    expect(isLumaCharge(charge({}))).toBe(true);
    expect(isLumaCharge(charge({ metadata: { other: "x" } }))).toBe(false);
    expect(isLumaCharge(charge({ metadata: null }))).toBe(false);
  });
});

describe("reconcile", () => {
  const event = { id: "evt-1", name: "Test Conference" };
  const guests = normalizeGuests({ entries: [paidGuest, uncapturedGuest, multiCurrencyGuest] });

  it("matches paid guests to Luma charges by email+currency and flags mismatches/refunds", () => {
    const r = reconcile(event, guests, [charge({}), charge({ id: "ch_usd", currency: "usd", amount: 6900, metadata: { luma_payment_started_api_id: "p2", email: "multi@example.com" } })], 0, false);
    const eur = r.matched.find((m) => m.currency === "eur")!;
    expect(eur.amount_mismatch).toBe(false);
    const usd = r.matched.find((m) => m.currency === "usd")!;
    expect(usd.amount_mismatch).toBe(true); // 7000 on Luma vs 6900 on Stripe
    // multi's unknown-currency bucket has no charge
    expect(r.luma_paid_no_charge).toEqual([{ email: "multi@example.com", name: "Marta Multi", currency: "unknown", luma_cents: 100 }]);
    expect(r.charge_no_guest).toEqual([]);
    expect(reconcileHasAnomalies(r)).toBe(true);
  });

  it("ignores non-Luma and non-succeeded charges, buckets orphan Luma charges", () => {
    const charges = [
      charge({ id: "ch_other", metadata: { email: "paid@example.com" } }), // not Luma-stamped
      charge({ id: "ch_failed", status: "failed" }),
      charge({ id: "ch_stranger", metadata: { luma_payment_started_api_id: "p3", email: "stranger@example.com" } }),
    ];
    const r = reconcile(event, guests, charges, 0, false);
    expect(r.luma_charges).toBe(1);
    expect(r.matched).toEqual([]);
    expect(r.charge_no_guest).toHaveLength(1);
    expect(r.charge_no_guest[0].email).toBe("stranger@example.com");
  });

  it("never counts uncaptured guests as reconcilable and totals per currency", () => {
    const r = reconcile(event, guests, [charge({})], 0, false);
    const eur = r.totals.find((t) => t.currency === "eur")!;
    expect(eur.luma_captured_cents).toBe(4000); // uncaptured 5000 excluded
    expect(eur.stripe_charged_cents).toBe(4000);
  });

  it("aggregates guests sharing one email symmetrically — no false mismatch", () => {
    const shared = (n: string) => ({
      api_id: `gst-${n}`,
      email: "team@example.com",
      name: `Member ${n}`,
      approval_status: "approved",
      event_ticket: { api_id: `tkt-${n}`, name: "General", amount: 5000, currency: "usd", is_captured: true, event_ticket_type_id: "tt-paid" },
    });
    const teamGuests = normalizeGuests({ entries: [shared("a"), shared("b")] });
    const teamCharges = [
      charge({ id: "ch_t1", currency: "usd", amount: 5000, metadata: { luma_payment_started_api_id: "p1", email: "team@example.com" } }),
      charge({ id: "ch_t2", currency: "usd", amount: 5000, metadata: { luma_payment_started_api_id: "p2", email: "team@example.com" } }),
    ];
    const r = reconcile(event, teamGuests, teamCharges, 0, false);
    expect(r.matched).toHaveLength(1);
    expect(r.matched[0]).toMatchObject({
      luma_cents: 10000,
      stripe_cents: 10000,
      amount_mismatch: false,
      name: "Member a, Member b",
    });
    expect(reconcileHasAnomalies(r)).toBe(false);
  });

  it("treats truncation as an anomaly and renders it loudly", () => {
    const r = reconcile(event, guests, [charge({})], 0, true);
    expect(reconcileHasAnomalies(r)).toBe(true);
    expect(renderReconcileMd(r)).toContain("INCOMPLETE");
  });

  it("renders a clean report for a fully matched event", () => {
    const paidOnly = normalizeGuests({ entries: [paidGuest] });
    const r = reconcile(event, paidOnly, [charge({})], 0, false);
    expect(reconcileHasAnomalies(r)).toBe(false);
    const md = renderReconcileMd(r);
    expect(md).toContain("1 matched");
    expect(md).toContain("40.00 EUR");
  });
});
