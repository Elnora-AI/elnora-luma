/**
 * Pure reporting core — normalization, classification, and aggregation for the
 * read-only `report` command group. No I/O in this file: every function takes
 * plain data and returns plain data, so the whole accounting surface is unit-
 * testable without touching the live API.
 *
 * Two hard-won rules from real event accounting are load-bearing here:
 *  1. A guest is PAID iff any of their tickets has `is_captured && amount > 0`.
 *     Never infer payment from ticket-type names (free tickets can have
 *     paid-sounding names), and `amount > 0` alone includes abandoned checkouts.
 *  2. Amounts are integer cents with a NULLABLE currency. Totals are bucketed
 *     per currency and never summed across currencies or assumed USD.
 *
 * Output determinism is a design property, not an accident: rows and buckets are
 * sorted, and volatile per-read fields (check_in_qr_code, signed URLs) are never
 * included — that is what makes `report diff` and git-diffed scheduled artifacts
 * work. Keep it that way.
 */

export const SALES_SCHEMA = "elnora-luma/report-sales@1";
export const SALES_CALENDAR_SCHEMA = "elnora-luma/report-sales-calendar@1";
export const ROSTER_SCHEMA = "elnora-luma/roster@1";

interface RawTicket {
  amount?: number | null;
  amount_discount?: number | null;
  amount_tax?: number | null;
  currency?: string | null;
  is_captured?: boolean | null;
  event_ticket_type_id?: string | null;
  name?: string | null;
  checked_in_at?: string | null;
}

interface RawOrder {
  amount?: number | null;
  amount_discount?: number | null;
  currency?: string | null;
  is_captured?: boolean | null;
  coupon_info?: { code?: string | null } | null;
}

export interface MoneyBucket {
  currency: string;
  gross_cents: number;
  discount_cents: number;
  tax_cents: number;
  tickets: number;
}

export type Payment = "paid" | "uncaptured" | "free";

export interface NormalizedGuest {
  key: string;
  guest_api_id: string;
  email: string;
  name: string;
  first_name: string;
  last_name: string;
  company: string;
  job_title: string;
  approval_status: string;
  payment: Payment;
  captured: MoneyBucket[];
  uncaptured_cents: number;
  ticket_type_ids: string[];
  /** Tickets held per ticket type id (no dedup — a guest can hold several tickets of one type). */
  ticket_type_counts: Record<string, number>;
  /** Type id of the first captured paid ticket (else first ticket) — where this guest's money is attributed. */
  primary_ticket_type_id: string;
  ticket_type: string;
  coupon_codes: string[];
  registered_at: string;
  checked_in_at: string;
  utm_source: string;
  custom_source: string;
}

export interface EventInfo {
  id: string;
  name: string;
  start_at: string;
  end_at: string;
  timezone: string;
}

export interface TicketTypeInfo {
  id: string;
  name: string;
  type: string;
  price_cents: number | null;
  currency: string;
  is_hidden: boolean;
  max_capacity: number | null;
}

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

function currencyKey(c: unknown): string {
  const s = str(c).trim().toLowerCase();
  return s === "" ? "unknown" : s;
}

/** The Luma API returns either `{entries: [...]}` or a bare array; entries carry
 *  guest fields both flat and duplicated under a nested `guest` key. */
export function extractEntries(resp: unknown): Record<string, unknown>[] {
  if (Array.isArray(resp)) return resp as Record<string, unknown>[];
  const entries = (resp as { entries?: unknown })?.entries;
  if (Array.isArray(entries)) return entries as Record<string, unknown>[];
  return [];
}

function answersLookup(raw: Record<string, unknown>, field: "answer_company" | "answer_job_title"): string {
  const answers = raw.registration_answers;
  if (!Array.isArray(answers)) return "";
  for (const a of answers) {
    const v = (a as Record<string, unknown>)?.[field];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return "";
}

export function normalizeGuest(entry: Record<string, unknown>): NormalizedGuest {
  const nested = entry.guest;
  const raw = { ...(typeof nested === "object" && nested !== null ? (nested as Record<string, unknown>) : {}), ...entry };

  const ticketsRaw = Array.isArray(raw.event_tickets)
    ? (raw.event_tickets as RawTicket[])
    : raw.event_ticket && typeof raw.event_ticket === "object"
      ? [raw.event_ticket as RawTicket]
      : [];

  const buckets = new Map<string, MoneyBucket>();
  let capturedTickets = 0;
  let uncapturedCents = 0;
  for (const t of ticketsRaw) {
    const amount = typeof t.amount === "number" ? t.amount : 0;
    if (amount <= 0) continue;
    if (t.is_captured) {
      const key = currencyKey(t.currency);
      const b = buckets.get(key) ?? { currency: key, gross_cents: 0, discount_cents: 0, tax_cents: 0, tickets: 0 };
      b.gross_cents += amount;
      b.discount_cents += typeof t.amount_discount === "number" ? t.amount_discount : 0;
      b.tax_cents += typeof t.amount_tax === "number" ? t.amount_tax : 0;
      b.tickets += 1;
      buckets.set(key, b);
      capturedTickets += 1;
    } else {
      uncapturedCents += amount;
    }
  }
  const payment: Payment = capturedTickets > 0 ? "paid" : uncapturedCents > 0 ? "uncaptured" : "free";

  const orders = Array.isArray(raw.event_ticket_orders) ? (raw.event_ticket_orders as RawOrder[]) : [];
  const couponCodes = Array.from(
    new Set(orders.map((o) => str(o?.coupon_info?.code).trim()).filter((c) => c !== "")),
  ).sort();

  const email = normalizeEmail(raw.email ?? raw.user_email);
  const apiId = str(raw.api_id ?? raw.id);
  const captured = Array.from(buckets.values()).sort((a, b) => a.currency.localeCompare(b.currency));
  const primaryTicket = ticketsRaw.find((t) => t.is_captured && (t.amount ?? 0) > 0) ?? ticketsRaw[0];

  return {
    key: email !== "" ? email : apiId,
    guest_api_id: apiId,
    email,
    name: str(raw.name ?? raw.user_name),
    first_name: str(raw.first_name ?? raw.user_first_name),
    last_name: str(raw.last_name ?? raw.user_last_name),
    company: answersLookup(raw, "answer_company"),
    job_title: answersLookup(raw, "answer_job_title"),
    approval_status: str(raw.approval_status),
    payment,
    captured,
    uncaptured_cents: uncapturedCents,
    ticket_type_ids: Array.from(new Set(ticketsRaw.map((t) => str(t.event_ticket_type_id)).filter((s) => s !== ""))).sort(),
    ticket_type_counts: ticketsRaw.reduce<Record<string, number>>((acc, t) => {
      const id = str(t.event_ticket_type_id);
      if (id !== "") acc[id] = (acc[id] ?? 0) + 1;
      return acc;
    }, {}),
    primary_ticket_type_id: str(primaryTicket?.event_ticket_type_id),
    ticket_type: str(primaryTicket?.name),
    coupon_codes: couponCodes,
    registered_at: str(raw.registered_at),
    checked_in_at: str(raw.checked_in_at),
    utm_source: str(raw.utm_source),
    custom_source: str(raw.custom_source),
  };
}

export function normalizeGuests(resp: unknown): NormalizedGuest[] {
  return extractEntries(resp)
    .map(normalizeGuest)
    .sort((a, b) => a.key.localeCompare(b.key) || a.guest_api_id.localeCompare(b.guest_api_id));
}

export function normalizeEventInfo(resp: unknown): EventInfo {
  const outer = (resp ?? {}) as Record<string, unknown>;
  const ev = (typeof outer.event === "object" && outer.event !== null ? outer.event : outer) as Record<string, unknown>;
  return {
    id: str(ev.api_id ?? ev.id),
    name: str(ev.name),
    start_at: str(ev.start_at),
    end_at: str(ev.end_at),
    timezone: str(ev.timezone),
  };
}

export function normalizeTicketTypes(resp: unknown): TicketTypeInfo[] {
  const outer = (resp ?? {}) as Record<string, unknown>;
  const list = Array.isArray(outer.ticket_types) ? outer.ticket_types : extractEntries(resp);
  return (list as Record<string, unknown>[])
    .map((tt) => ({
      id: str(tt.api_id ?? tt.id),
      name: str(tt.name),
      type: str(tt.type),
      price_cents: typeof tt.cents === "number" ? tt.cents : null,
      currency: currencyKey(tt.currency),
      is_hidden: tt.is_hidden === true,
      max_capacity: typeof tt.max_capacity === "number" ? tt.max_capacity : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export interface TicketTypeSales extends TicketTypeInfo {
  sold: number;
  captured: number;
  captured_gross: { currency: string; cents: number }[];
  capacity_pct: number | null;
}

export interface CouponUsage {
  code: string;
  uses: number;
  captured_uses: number;
  discount_cents: number;
  currency: string;
}

export interface SalesSummary {
  schema: string;
  event: EventInfo;
  guests: {
    total: number;
    by_approval_status: Record<string, number>;
    by_payment: Record<Payment, number>;
    checked_in: number;
    pending_approval: { count: number; oldest_registered_at: string };
  };
  revenue: MoneyBucket[];
  ticket_types: TicketTypeSales[];
  coupons: CouponUsage[];
}

function sortedCountMap(values: string[]): Record<string, number> {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v || "unknown", (counts.get(v || "unknown") ?? 0) + 1);
  const out: Record<string, number> = {};
  for (const k of Array.from(counts.keys()).sort()) out[k] = counts.get(k)!;
  return out;
}

/** Coupon usage comes from guests' `event_ticket_orders[].coupon_info`; discount
 *  totals count captured orders only (an abandoned checkout is not a realized
 *  discount). `uses` counts all orders that referenced the code. */
export function couponUsage(entries: Record<string, unknown>[]): CouponUsage[] {
  const usage = new Map<string, CouponUsage>();
  for (const entry of entries) {
    const nested = entry.guest;
    const raw = { ...(typeof nested === "object" && nested !== null ? (nested as Record<string, unknown>) : {}), ...entry };
    const orders = Array.isArray(raw.event_ticket_orders) ? (raw.event_ticket_orders as RawOrder[]) : [];
    for (const o of orders) {
      const code = str(o?.coupon_info?.code).trim();
      if (code === "") continue;
      const key = `${code.toLowerCase()}|${currencyKey(o.currency)}`;
      const u = usage.get(key) ?? { code, uses: 0, captured_uses: 0, discount_cents: 0, currency: currencyKey(o.currency) };
      u.uses += 1;
      if (o.is_captured) {
        u.captured_uses += 1;
        u.discount_cents += typeof o.amount_discount === "number" ? o.amount_discount : 0;
      }
      usage.set(key, u);
    }
  }
  return Array.from(usage.values()).sort((a, b) => a.code.localeCompare(b.code) || a.currency.localeCompare(b.currency));
}

export function buildSalesSummary(
  event: EventInfo,
  ticketTypes: TicketTypeInfo[],
  guests: NormalizedGuest[],
  rawGuestEntries: Record<string, unknown>[],
): SalesSummary {
  const revenue = new Map<string, MoneyBucket>();
  for (const g of guests) {
    for (const b of g.captured) {
      const agg = revenue.get(b.currency) ?? { currency: b.currency, gross_cents: 0, discount_cents: 0, tax_cents: 0, tickets: 0 };
      agg.gross_cents += b.gross_cents;
      agg.discount_cents += b.discount_cents;
      agg.tax_cents += b.tax_cents;
      agg.tickets += b.tickets;
      revenue.set(b.currency, agg);
    }
  }

  const pending = guests.filter((g) => g.approval_status === "pending_approval");
  const oldestPending = pending
    .map((g) => g.registered_at)
    .filter((s) => s !== "")
    .sort()[0] ?? "";

  // Per-ticket-type sales: declined guests don't hold a seat.
  const holding = guests.filter((g) => g.approval_status !== "declined");
  const soldByType = new Map<string, { sold: number; captured: number; gross: Map<string, number> }>();
  for (const g of holding) {
    // `sold` counts TICKETS (seats), not guests — max_capacity caps tickets,
    // and a guest can hold several tickets of one type.
    for (const [id, n] of Object.entries(g.ticket_type_counts)) {
      const s = soldByType.get(id) ?? { sold: 0, captured: 0, gross: new Map() };
      s.sold += n;
      soldByType.set(id, s);
    }
    if (g.payment === "paid") {
      // Attribute captured money to the type of the guest's captured ticket —
      // a guest nearly always has exactly one type.
      const id = g.primary_ticket_type_id !== "" ? g.primary_ticket_type_id : g.ticket_type_ids[0];
      if (id !== undefined && id !== "") {
        const s = soldByType.get(id) ?? { sold: 0, captured: 0, gross: new Map() };
        s.captured += 1;
        for (const b of g.captured) s.gross.set(b.currency, (s.gross.get(b.currency) ?? 0) + b.gross_cents);
        soldByType.set(id, s);
      }
    }
  }
  const knownIds = new Set(ticketTypes.map((t) => t.id));
  const phantomTypes: TicketTypeInfo[] = Array.from(soldByType.keys())
    .filter((id) => !knownIds.has(id))
    .sort()
    .map((id) => ({ id, name: "(unknown ticket type)", type: "", price_cents: null, currency: "unknown", is_hidden: false, max_capacity: null }));

  const ticketTypeSales: TicketTypeSales[] = [...ticketTypes, ...phantomTypes].map((tt) => {
    const s = soldByType.get(tt.id) ?? { sold: 0, captured: 0, gross: new Map<string, number>() };
    return {
      ...tt,
      sold: s.sold,
      captured: s.captured,
      captured_gross: Array.from(s.gross.entries())
        .map(([currency, cents]) => ({ currency, cents }))
        .sort((a, b) => a.currency.localeCompare(b.currency)),
      capacity_pct: tt.max_capacity !== null && tt.max_capacity > 0 ? Math.round((s.sold / tt.max_capacity) * 100) : null,
    };
  });

  return {
    schema: SALES_SCHEMA,
    event,
    guests: {
      total: guests.length,
      by_approval_status: sortedCountMap(guests.map((g) => g.approval_status)),
      by_payment: {
        paid: guests.filter((g) => g.payment === "paid").length,
        uncaptured: guests.filter((g) => g.payment === "uncaptured").length,
        free: guests.filter((g) => g.payment === "free").length,
      },
      checked_in: guests.filter((g) => g.checked_in_at !== "").length,
      pending_approval: { count: pending.length, oldest_registered_at: oldestPending },
    },
    revenue: Array.from(revenue.values()).sort((a, b) => a.currency.localeCompare(b.currency)),
    ticket_types: ticketTypeSales,
    coupons: couponUsage(rawGuestEntries),
  };
}

export interface RosterRow {
  key: string;
  guest_api_id: string;
  email: string;
  name: string;
  first_name: string;
  last_name: string;
  company: string;
  job_title: string;
  approval_status: string;
  payment: Payment;
  amount_cents: number;
  amount: string;
  amount_discount_cents: number;
  amount_tax_cents: number;
  currency: string;
  ticket_type: string;
  coupon_codes: string;
  registered_at: string;
  checked_in_at: string;
  utm_source: string;
  custom_source: string;
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** One row per guest; a guest whose captured tickets span several currencies
 *  (rare) becomes one row per currency — amounts are never summed across
 *  currencies. Guests with no captured money get a single zero row. */
export function buildRosterRows(guests: NormalizedGuest[]): RosterRow[] {
  const rows: RosterRow[] = [];
  for (const g of guests) {
    const buckets = g.captured.length > 0 ? g.captured : [{ currency: "", gross_cents: 0, discount_cents: 0, tax_cents: 0, tickets: 0 }];
    for (const b of buckets) {
      rows.push({
        key: g.key,
        guest_api_id: g.guest_api_id,
        email: g.email,
        name: g.name,
        first_name: g.first_name,
        last_name: g.last_name,
        company: g.company,
        job_title: g.job_title,
        approval_status: g.approval_status,
        payment: g.payment,
        amount_cents: b.gross_cents,
        amount: formatCents(b.gross_cents),
        amount_discount_cents: b.discount_cents,
        amount_tax_cents: b.tax_cents,
        currency: b.currency,
        ticket_type: g.ticket_type,
        coupon_codes: g.coupon_codes.join(" "),
        registered_at: g.registered_at,
        checked_in_at: g.checked_in_at,
        utm_source: g.utm_source,
        custom_source: g.custom_source,
      });
    }
  }
  return rows.sort((a, b) => a.key.localeCompare(b.key) || a.guest_api_id.localeCompare(b.guest_api_id) || a.currency.localeCompare(b.currency));
}

export const ROSTER_COLUMNS: (keyof RosterRow)[] = [
  "name",
  "first_name",
  "last_name",
  "email",
  "company",
  "job_title",
  "approval_status",
  "payment",
  "amount_cents",
  "amount",
  "amount_discount_cents",
  "amount_tax_cents",
  "currency",
  "ticket_type",
  "coupon_codes",
  "registered_at",
  "checked_in_at",
  "utm_source",
  "custom_source",
  "guest_api_id",
];

export interface Warning {
  code: string;
  message: string;
}

export interface CheckThresholds {
  capacityPct: number;
  pendingHours: number;
  startSoonHours: number;
}

export function computeWarnings(summary: SalesSummary, thresholds: CheckThresholds, nowMs: number): Warning[] {
  const warnings: Warning[] = [];
  for (const tt of summary.ticket_types) {
    if (tt.max_capacity === null || tt.max_capacity <= 0) continue;
    if (tt.sold >= tt.max_capacity) {
      warnings.push({ code: "sold_out", message: `Ticket type "${tt.name}" is sold out (${tt.sold}/${tt.max_capacity}).` });
    } else if (tt.capacity_pct !== null && tt.capacity_pct >= thresholds.capacityPct) {
      warnings.push({ code: "near_capacity", message: `Ticket type "${tt.name}" is at ${tt.capacity_pct}% capacity (${tt.sold}/${tt.max_capacity}).` });
    }
  }
  const pending = summary.guests.pending_approval;
  if (pending.count > 0 && pending.oldest_registered_at !== "") {
    const oldestMs = Date.parse(pending.oldest_registered_at);
    if (Number.isFinite(oldestMs) && nowMs - oldestMs > thresholds.pendingHours * 3_600_000) {
      const hours = Math.floor((nowMs - oldestMs) / 3_600_000);
      warnings.push({ code: "pending_aging", message: `${pending.count} guest(s) pending approval; oldest has waited ${hours}h.` });
    }
  }
  if (pending.count > 0 && summary.event.start_at !== "") {
    const startMs = Date.parse(summary.event.start_at);
    if (Number.isFinite(startMs) && startMs > nowMs && startMs - nowMs < thresholds.startSoonHours * 3_600_000) {
      warnings.push({ code: "pending_before_start", message: `Event starts within ${thresholds.startSoonHours}h with ${pending.count} approval(s) outstanding.` });
    }
  }
  return warnings;
}

export function money(cents: number, currency: string): string {
  return `${formatCents(cents)} ${currency === "" || currency === "unknown" ? "?" : currency.toUpperCase()}`;
}

/** API-derived strings (guest/ticket/coupon/event names) rendered into markdown:
 *  collapse control chars/newlines to a space and escape `|` so a registrant-
 *  chosen name can never spoof report structure or break table cells.
 *  Deterministic, so `report diff` stability is preserved. */
export function mdSafe(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\|/g, "\\|").trim();
}

export function renderSalesMd(s: SalesSummary): string {
  const lines: string[] = [];
  lines.push(`# Sales report — ${mdSafe(s.event.name || s.event.id)}`);
  lines.push("");
  lines.push(`Event \`${s.event.id}\` · starts ${s.event.start_at || "?"} (${s.event.timezone || "tz unknown"})`);
  lines.push("");
  const rev = s.revenue.length > 0
    ? s.revenue.map((b) => `${money(b.gross_cents, b.currency)} gross (${b.tickets} tickets, discounts ${money(b.discount_cents, b.currency)}, tax ${money(b.tax_cents, b.currency)})`).join("; ")
    : "no captured revenue";
  lines.push(`**Captured revenue:** ${rev}`);
  const g = s.guests;
  lines.push(`**Guests:** ${g.total} total — ${g.by_payment.paid} paid, ${g.by_payment.free} free/comp, ${g.by_payment.uncaptured} uncaptured checkout; ${g.checked_in} checked in`);
  const statuses = Object.entries(g.by_approval_status).map(([k, v]) => `${k}: ${v}`).join(", ");
  lines.push(`**Approval status:** ${statuses || "none"}`);
  if (g.pending_approval.count > 0) {
    lines.push(`**Approval queue:** ${g.pending_approval.count} pending (oldest ${g.pending_approval.oldest_registered_at || "?"})`);
  }
  if (s.ticket_types.length > 0) {
    lines.push("");
    lines.push("| Ticket type | Sold | Captured | Revenue | Capacity |");
    lines.push("|---|---|---|---|---|");
    for (const tt of s.ticket_types) {
      const revs = tt.captured_gross.map((x) => money(x.cents, x.currency)).join("; ") || "—";
      const cap = tt.max_capacity !== null ? `${tt.sold}/${tt.max_capacity}${tt.capacity_pct !== null ? ` (${tt.capacity_pct}%)` : ""}` : "—";
      lines.push(`| ${mdSafe(tt.name)}${tt.is_hidden ? " (hidden)" : ""} | ${tt.sold} | ${tt.captured} | ${revs} | ${cap} |`);
    }
  }
  if (s.coupons.length > 0) {
    lines.push("");
    lines.push("| Coupon | Uses | Captured uses | Discount given |");
    lines.push("|---|---|---|---|");
    for (const c of s.coupons) {
      lines.push(`| ${mdSafe(c.code)} | ${c.uses} | ${c.captured_uses} | ${money(c.discount_cents, c.currency)} |`);
    }
  }
  return lines.join("\n") + "\n";
}

export interface CalendarSales {
  schema: string;
  window: { after: string; before: string };
  events: SalesSummary[];
  totals: MoneyBucket[];
}

export function buildCalendarSales(window: { after: string; before: string }, events: SalesSummary[]): CalendarSales {
  const totals = new Map<string, MoneyBucket>();
  for (const ev of events) {
    for (const b of ev.revenue) {
      const agg = totals.get(b.currency) ?? { currency: b.currency, gross_cents: 0, discount_cents: 0, tax_cents: 0, tickets: 0 };
      agg.gross_cents += b.gross_cents;
      agg.discount_cents += b.discount_cents;
      agg.tax_cents += b.tax_cents;
      agg.tickets += b.tickets;
      totals.set(b.currency, agg);
    }
  }
  const sorted = [...events].sort((a, b) => a.event.start_at.localeCompare(b.event.start_at) || a.event.id.localeCompare(b.event.id));
  return {
    schema: SALES_CALENDAR_SCHEMA,
    window,
    events: sorted,
    totals: Array.from(totals.values()).sort((a, b) => a.currency.localeCompare(b.currency)),
  };
}

export function renderCalendarSalesMd(c: CalendarSales): string {
  const lines: string[] = [];
  lines.push(`# Calendar sales report`);
  lines.push("");
  lines.push(`Window: ${c.window.after || "(beginning)"} → ${c.window.before || "(now)"} · ${c.events.length} event(s)`);
  lines.push("");
  lines.push("| Event | Starts | Paid | Free | Revenue |");
  lines.push("|---|---|---|---|---|");
  for (const ev of c.events) {
    const rev = ev.revenue.map((b) => money(b.gross_cents, b.currency)).join("; ") || "—";
    lines.push(`| ${mdSafe(ev.event.name || ev.event.id)} | ${ev.event.start_at || "?"} | ${ev.guests.by_payment.paid} | ${ev.guests.by_payment.free} | ${rev} |`);
  }
  lines.push("");
  const totals = c.totals.map((b) => `${money(b.gross_cents, b.currency)} gross (${b.tickets} tickets)`).join("; ") || "no captured revenue";
  lines.push(`**Totals:** ${totals}`);
  return lines.join("\n") + "\n";
}
