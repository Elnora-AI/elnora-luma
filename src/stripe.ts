/**
 * Read-only Stripe client + Luma↔Stripe reconciliation.
 *
 * Luma routes card payments as charges into the ORGANIZER'S OWN connected
 * Stripe account and stamps `metadata.luma_payment_started_api_id` on them
 * (observed behavior — not documented by Luma). That makes "do my Luma paid
 * guests match the charges that actually landed?" answerable for any organizer.
 *
 * Security model, structural not conventional:
 *  - single pinned host (api.stripe.com), path always appended to the const
 *  - the client sends GET requests only — there is no code path that can
 *    mutate anything in Stripe
 *  - STRIPE_API_KEY comes from the same allowlisted env chain as the Luma key;
 *    docs tell users to create a RESTRICTED read-only key (rk_...)
 */
import { mdSafe, money, normalizeEmail, type NormalizedGuest } from "./reporting.js";

export const STRIPE_BASE_URL = "https://api.stripe.com";
const MAX_PAGES = 50;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export class StripeApiError extends Error {
  constructor(public status: number, public statusText: string, public body: unknown, public path: string) {
    super(`Stripe API GET ${path} → HTTP ${status} ${statusText}`);
  }
}

export function getStripeKey(): string {
  const key = process.env.STRIPE_API_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_API_KEY is not set. Create a RESTRICTED read-only key (rk_...) at https://dashboard.stripe.com/apikeys, " +
        "then run `luma auth set-key <luma-key> --stripe-key <rk_key>` or export STRIPE_API_KEY.",
    );
  }
  return key;
}

interface StripeCallOptions {
  apiKey: string;
  path: string;
  query?: Record<string, string | number | undefined>;
  fetchImpl?: typeof fetch;
}

/** GET-only by construction: no method parameter exists. */
export async function callStripe(opts: StripeCallOptions): Promise<unknown> {
  const url = new URL(STRIPE_BASE_URL + opts.path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  const doFetch = opts.fetchImpl ?? fetch;
  let lastResp: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await doFetch(url, {
      method: "GET",
      headers: { authorization: `Bearer ${opts.apiKey}`, accept: "application/json" },
    });
    lastResp = resp;
    if (RETRYABLE.has(resp.status) && attempt < 2) {
      const retryAfter = Number(resp.headers.get("retry-after") || "");
      const backoffMs = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 10_000) : Math.min(1000 * 2 ** attempt, 5000);
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
    if (!resp.ok) throw new StripeApiError(resp.status, resp.statusText, parsed, opts.path);
    return parsed;
  }
  throw new StripeApiError(lastResp?.status ?? 0, lastResp?.statusText ?? "exhausted retries", null, opts.path);
}

export interface StripeCharge {
  id: string;
  amount: number;
  amount_refunded: number;
  currency: string;
  status: string;
  paid: boolean;
  refunded: boolean;
  created: number;
  receipt_email?: string | null;
  billing_details?: { email?: string | null } | null;
  metadata?: Record<string, string> | null;
}

export interface ChargeListResult {
  charges: StripeCharge[];
  truncated: boolean;
}

/** List charges created at/after `sinceUnix`, following `starting_after` cursors
 *  up to a hard page cap (an organizer's Stripe account may carry unrelated
 *  volume; the cap bounds cost and is surfaced as `truncated`). */
export async function listCharges(apiKey: string, sinceUnix: number, fetchImpl?: typeof fetch): Promise<ChargeListResult> {
  const charges: StripeCharge[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const resp = (await callStripe({
      apiKey,
      path: "/v1/charges",
      query: { limit: 100, "created[gte]": sinceUnix, starting_after: startingAfter },
      fetchImpl,
    })) as { data?: StripeCharge[]; has_more?: boolean };
    const data = Array.isArray(resp?.data) ? resp.data : [];
    charges.push(...data);
    if (!resp?.has_more || data.length === 0) return { charges, truncated: false };
    startingAfter = data[data.length - 1].id;
  }
  return { charges, truncated: true };
}

export function chargeEmail(c: StripeCharge): string {
  return normalizeEmail(c.metadata?.email) || normalizeEmail(c.receipt_email) || normalizeEmail(c.billing_details?.email);
}

export function isLumaCharge(c: StripeCharge): boolean {
  return typeof c.metadata?.luma_payment_started_api_id === "string" && c.metadata.luma_payment_started_api_id !== "";
}

export const RECONCILE_SCHEMA = "elnora-luma/stripe-reconcile@1";

export interface ReconcileMatch {
  email: string;
  name: string;
  currency: string;
  luma_cents: number;
  stripe_cents: number;
  stripe_refunded_cents: number;
  charge_ids: string[];
  amount_mismatch: boolean;
}

export interface ReconcileReport {
  schema: string;
  event: { id: string; name: string };
  since_unix: number;
  matched: ReconcileMatch[];
  luma_paid_no_charge: { email: string; name: string; currency: string; luma_cents: number }[];
  charge_no_guest: { email: string; charge_id: string; currency: string; cents: number; refunded_cents: number }[];
  unmatchable_guests: number;
  totals: { currency: string; luma_captured_cents: number; stripe_charged_cents: number; stripe_refunded_cents: number }[];
  charges_scanned: number;
  luma_charges: number;
  truncated: boolean;
}

/** Email-keyed reconciliation between this event's PAID guests and the
 *  Luma-stamped succeeded charges on the organizer's Stripe account.
 *  Matching is by normalized email ONLY (never name or amount — amounts are
 *  compared on matched pairs and surfaced as mismatch flags). Charges are
 *  account-wide: an unmatched Luma charge may simply belong to another event,
 *  which is why `charge_no_guest` is a review bucket, not an error — and a
 *  matched email whose Stripe total exceeds its Luma total may just have paid
 *  for another event inside the --since window. */
export function reconcile(
  event: { id: string; name: string },
  guests: NormalizedGuest[],
  charges: StripeCharge[],
  sinceUnix: number,
  truncated: boolean,
): ReconcileReport {
  const lumaCharges = charges.filter((c) => isLumaCharge(c) && c.status === "succeeded");

  interface ChargeAgg {
    cents: number;
    refunded: number;
    ids: string[];
  }
  const chargesByKey = new Map<string, ChargeAgg>();
  for (const c of lumaCharges) {
    const email = chargeEmail(c);
    if (email === "") continue;
    const key = `${email}|${(c.currency || "unknown").toLowerCase()}`;
    const agg = chargesByKey.get(key) ?? { cents: 0, refunded: 0, ids: [] };
    agg.cents += c.amount;
    agg.refunded += c.amount_refunded ?? 0;
    agg.ids.push(c.id);
    chargesByKey.set(key, agg);
  }

  // Aggregate the Luma side symmetrically: multiple paid guests can share an
  // email, so compare per-key totals, never one guest against the key total.
  interface LumaAgg {
    email: string;
    currency: string;
    cents: number;
    names: string[];
  }
  const lumaByKey = new Map<string, LumaAgg>();
  let unmatchable = 0;
  for (const g of guests) {
    if (g.payment !== "paid") continue;
    if (g.email === "") {
      unmatchable += 1;
      continue;
    }
    for (const b of g.captured) {
      const key = `${g.email}|${b.currency}`;
      const agg = lumaByKey.get(key) ?? { email: g.email, currency: b.currency, cents: 0, names: [] };
      agg.cents += b.gross_cents;
      if (g.name !== "" && !agg.names.includes(g.name)) agg.names.push(g.name);
      lumaByKey.set(key, agg);
    }
  }

  const matched: ReconcileMatch[] = [];
  const noCharge: ReconcileReport["luma_paid_no_charge"] = [];
  const matchedKeys = new Set<string>();
  for (const [key, l] of lumaByKey) {
    const agg = chargesByKey.get(key);
    if (agg) {
      matchedKeys.add(key);
      matched.push({
        email: l.email,
        name: l.names.join(", "),
        currency: l.currency,
        luma_cents: l.cents,
        stripe_cents: agg.cents,
        stripe_refunded_cents: agg.refunded,
        charge_ids: [...agg.ids].sort(),
        amount_mismatch: agg.cents !== l.cents,
      });
    } else {
      noCharge.push({ email: l.email, name: l.names.join(", "), currency: l.currency, luma_cents: l.cents });
    }
  }

  const orphans: ReconcileReport["charge_no_guest"] = Array.from(chargesByKey.entries())
    .filter(([key]) => !matchedKeys.has(key))
    .map(([key, agg]) => ({
      email: key.slice(0, key.lastIndexOf("|")),
      charge_id: agg.ids.sort().join(" "),
      currency: key.slice(key.lastIndexOf("|") + 1),
      cents: agg.cents,
      refunded_cents: agg.refunded,
    }));

  const totals = new Map<string, { luma: number; stripe: number; refunded: number }>();
  const bump = (currency: string, field: "luma" | "stripe" | "refunded", cents: number): void => {
    const t = totals.get(currency) ?? { luma: 0, stripe: 0, refunded: 0 };
    t[field] += cents;
    totals.set(currency, t);
  };
  for (const g of guests) {
    if (g.payment !== "paid") continue;
    for (const b of g.captured) bump(b.currency, "luma", b.gross_cents);
  }
  for (const c of lumaCharges) {
    bump((c.currency || "unknown").toLowerCase(), "stripe", c.amount);
    bump((c.currency || "unknown").toLowerCase(), "refunded", c.amount_refunded ?? 0);
  }

  const byKey = <T extends { email: string; currency: string }>(a: T, b: T): number =>
    a.email.localeCompare(b.email) || a.currency.localeCompare(b.currency);

  return {
    schema: RECONCILE_SCHEMA,
    event,
    since_unix: sinceUnix,
    matched: matched.sort(byKey),
    luma_paid_no_charge: noCharge.sort(byKey),
    charge_no_guest: orphans.sort(byKey),
    unmatchable_guests: unmatchable,
    totals: Array.from(totals.entries())
      .map(([currency, t]) => ({
        currency,
        luma_captured_cents: t.luma,
        stripe_charged_cents: t.stripe,
        stripe_refunded_cents: t.refunded,
      }))
      .sort((a, b) => a.currency.localeCompare(b.currency)),
    charges_scanned: charges.length,
    luma_charges: lumaCharges.length,
    truncated,
  };
}

export function reconcileHasAnomalies(r: ReconcileReport): boolean {
  return (
    r.luma_paid_no_charge.length > 0 ||
    r.charge_no_guest.length > 0 ||
    r.matched.some((m) => m.amount_mismatch || m.stripe_refunded_cents > 0) ||
    r.truncated
  );
}

export function renderReconcileMd(r: ReconcileReport): string {
  const lines: string[] = [];
  lines.push(`# Stripe reconciliation — ${mdSafe(r.event.name || r.event.id)}`);
  lines.push("");
  lines.push(
    `Scanned ${r.charges_scanned} charge(s) since unix ${r.since_unix}; ${r.luma_charges} Luma-originated. ` +
      `${r.matched.length} matched, ${r.luma_paid_no_charge.length} paid guest(s) without a charge, ${r.charge_no_guest.length} charge(s) without a guest.` +
      (r.unmatchable_guests > 0 ? ` ${r.unmatchable_guests} paid guest(s) had no email to match on.` : "") +
      (r.truncated ? " ⚠ charge listing hit the page cap — results are INCOMPLETE, narrow with --since." : ""),
  );
  lines.push("");
  for (const t of r.totals) {
    lines.push(
      `- ${t.currency.toUpperCase()}: Luma captured ${money(t.luma_captured_cents, t.currency)} vs Stripe charged ${money(t.stripe_charged_cents, t.currency)}` +
        (t.stripe_refunded_cents > 0 ? ` (refunded ${money(t.stripe_refunded_cents, t.currency)})` : ""),
    );
  }
  const mismatches = r.matched.filter((m) => m.amount_mismatch || m.stripe_refunded_cents > 0);
  if (mismatches.length > 0) {
    lines.push("");
    lines.push("## Matched with anomalies");
    for (const m of mismatches) {
      const bits = [];
      if (m.amount_mismatch) bits.push(`Luma ${money(m.luma_cents, m.currency)} ≠ Stripe ${money(m.stripe_cents, m.currency)}`);
      if (m.stripe_refunded_cents > 0) bits.push(`refunded ${money(m.stripe_refunded_cents, m.currency)} on Stripe`);
      lines.push(`- ${mdSafe(m.email)} (${m.charge_ids.map(mdSafe).join(", ")}): ${bits.join("; ")}`);
    }
  }
  if (r.luma_paid_no_charge.length > 0) {
    lines.push("");
    lines.push("## Paid on Luma, no Stripe charge found");
    for (const g of r.luma_paid_no_charge) lines.push(`- ${mdSafe(g.name || g.email)} <${mdSafe(g.email)}> — ${money(g.luma_cents, g.currency)}`);
  }
  if (r.charge_no_guest.length > 0) {
    lines.push("");
    lines.push("## Luma charges with no matching paid guest (possibly other events)");
    for (const c of r.charge_no_guest) lines.push(`- ${mdSafe(c.email) || "(no email)"} — ${money(c.cents, c.currency)} (${mdSafe(c.charge_id)})`);
  }
  return lines.join("\n") + "\n";
}
