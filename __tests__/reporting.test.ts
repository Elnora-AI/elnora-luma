import { describe, expect, it } from "vitest";
import {
  buildCalendarSales,
  buildRosterRows,
  buildSalesSummary,
  computeWarnings,
  couponUsage,
  extractEntries,
  formatCents,
  mdSafe,
  normalizeEventInfo,
  normalizeGuest,
  normalizeGuests,
  normalizeTicketTypes,
  renderCalendarSalesMd,
  renderSalesMd,
} from "../src/reporting.js";
import {
  allGuests,
  declinedGuest,
  eventResponse,
  freeGuest,
  multiCurrencyGuest,
  paidGuest,
  pendingGuest,
  ticketTypesResponse,
  uncapturedGuest,
} from "./fixtures.js";

const event = normalizeEventInfo(eventResponse);
const ticketTypes = normalizeTicketTypes(ticketTypesResponse);
const guests = normalizeGuests({ entries: allGuests });
const summary = buildSalesSummary(event, ticketTypes, guests, allGuests as Record<string, unknown>[]);

describe("normalizeGuest — classification", () => {
  it("classifies captured amount>0 as paid, with normalized email and answers extraction", () => {
    const g = normalizeGuest(paidGuest as Record<string, unknown>);
    expect(g.payment).toBe("paid");
    expect(g.email).toBe("paid@example.com");
    expect(g.key).toBe("paid@example.com");
    expect(g.company).toBe("Acme GmbH");
    expect(g.job_title).toBe("CFO");
    expect(g.captured).toEqual([{ currency: "eur", gross_cents: 4000, discount_cents: 1000, tax_cents: 800, tickets: 1 }]);
    expect(g.coupon_codes).toEqual(["SAVE20"]);
  });

  it("never counts an uncaptured amount>0 checkout as paid", () => {
    const g = normalizeGuest(uncapturedGuest as Record<string, unknown>);
    expect(g.payment).toBe("uncaptured");
    expect(g.captured).toEqual([]);
    expect(g.uncaptured_cents).toBe(5000);
  });

  it("classifies amount 0 tickets as free regardless of ticket name", () => {
    const g = normalizeGuest(freeGuest as Record<string, unknown>);
    expect(g.payment).toBe("free");
    expect(g.ticket_type).toBe("Community");
  });

  it("handles guests with no tickets and no email (api_id key fallback)", () => {
    const g = normalizeGuest(pendingGuest as Record<string, unknown>);
    expect(g.payment).toBe("free");
    expect(g.key).toBe("gst-pending");
  });

  it("buckets multi-currency captures separately, null currency → unknown", () => {
    const g = normalizeGuest(multiCurrencyGuest as Record<string, unknown>);
    expect(g.captured).toEqual([
      { currency: "unknown", gross_cents: 100, discount_cents: 0, tax_cents: 0, tickets: 1 },
      { currency: "usd", gross_cents: 7000, discount_cents: 0, tax_cents: 0, tickets: 1 },
    ]);
  });

  it("accepts a bare array response and flat (non-nested) guest fields", () => {
    expect(extractEntries([freeGuest])).toHaveLength(1);
    const g = normalizeGuest(freeGuest as Record<string, unknown>);
    expect(g.name).toBe("Frida Free");
  });
});

describe("buildSalesSummary", () => {
  it("aggregates captured revenue per currency only", () => {
    expect(summary.revenue).toEqual([
      { currency: "eur", gross_cents: 4000, discount_cents: 1000, tax_cents: 800, tickets: 1 },
      { currency: "unknown", gross_cents: 100, discount_cents: 0, tax_cents: 0, tickets: 1 },
      { currency: "usd", gross_cents: 7000, discount_cents: 0, tax_cents: 0, tickets: 1 },
    ]);
  });

  it("counts payment classes and approval statuses on separate axes", () => {
    expect(summary.guests.by_payment).toEqual({ paid: 2, uncaptured: 1, free: 3 });
    expect(summary.guests.by_approval_status).toEqual({ approved: 4, declined: 1, pending_approval: 1 });
    expect(summary.guests.checked_in).toBe(1);
    expect(summary.guests.pending_approval).toEqual({ count: 1, oldest_registered_at: "2030-05-04T10:00:00.000Z" });
  });

  it("counts sold TICKETS (seats) per type, excluding declined guests", () => {
    const general = summary.ticket_types.find((t) => t.id === "tt-paid")!;
    // paid (1 ticket) + uncaptured (1) + multi (2 tickets of tt-paid) hold 4 seats;
    // declined holds none. max_capacity caps tickets, not guests.
    expect(general.sold).toBe(4);
    expect(general.captured).toBe(2);
    expect(general.capacity_pct).toBe(4);
    const community = summary.ticket_types.find((t) => t.id === "tt-free")!;
    expect(community.sold).toBe(1);
    expect(community.max_capacity).toBe(10);
  });

  it("attributes captured money to the captured ticket's own type", () => {
    const paidElsewhere = {
      api_id: "gst-two-types",
      email: "two@example.com",
      approval_status: "approved",
      event_tickets: [
        { api_id: "t-a", name: "Addon", amount: 0, currency: "eur", is_captured: false, event_ticket_type_id: "tt-aaa-addon" },
        { api_id: "t-b", name: "General", amount: 5000, currency: "eur", is_captured: true, event_ticket_type_id: "tt-paid" },
      ],
    };
    const s = buildSalesSummary(event, ticketTypes, normalizeGuests({ entries: [paidElsewhere] }), []);
    const general = s.ticket_types.find((t) => t.id === "tt-paid")!;
    expect(general.captured).toBe(1);
    expect(general.captured_gross).toEqual([{ currency: "eur", cents: 5000 }]);
    // the alphabetically-first type (tt-aaa-addon) must get NO money
    const addon = s.ticket_types.find((t) => t.id === "tt-aaa-addon")!;
    expect(addon.captured).toBe(0);
    expect(addon.captured_gross).toEqual([]);
  });

  it("computes coupon usage: uses counts all orders, discounts count captured only", () => {
    expect(summary.coupons).toEqual([
      { code: "SAVE20", uses: 2, captured_uses: 1, discount_cents: 1000, currency: "eur" },
    ]);
  });

  it("synthesizes a row for ticket types missing from the list", () => {
    const s = buildSalesSummary(event, [], guests, []);
    const phantom = s.ticket_types.find((t) => t.id === "tt-paid")!;
    expect(phantom.name).toBe("(unknown ticket type)");
  });

  it("is deterministic: same input → byte-identical JSON", () => {
    const again = buildSalesSummary(event, ticketTypes, normalizeGuests({ entries: [...allGuests].reverse() }), [
      ...allGuests,
    ] as Record<string, unknown>[]);
    expect(JSON.stringify(again)).toBe(JSON.stringify(summary));
  });
});

describe("buildRosterRows", () => {
  const rows = buildRosterRows(guests);

  it("emits one row per guest per captured currency, sorted by key", () => {
    const multi = rows.filter((r) => r.email === "multi@example.com");
    expect(multi).toHaveLength(2);
    expect(multi.map((r) => r.currency)).toEqual(["unknown", "usd"]);
    expect(rows.map((r) => r.key)).toEqual([...rows.map((r) => r.key)].sort());
  });

  it("gives zero-money guests a single empty-currency row", () => {
    const p = rows.filter((r) => r.guest_api_id === "gst-pending");
    expect(p).toHaveLength(1);
    expect(p[0].amount_cents).toBe(0);
    expect(p[0].currency).toBe("");
  });

  it("formats decimal amounts from integer cents", () => {
    expect(formatCents(4000)).toBe("40.00");
    expect(formatCents(5)).toBe("0.05");
    expect(formatCents(0)).toBe("0.00");
    expect(formatCents(-1234)).toBe("-12.34");
  });
});

describe("computeWarnings", () => {
  const now = Date.parse("2030-06-07T12:00:00.000Z"); // 23h before event start

  it("fires sold_out and near_capacity at the right thresholds", () => {
    const tight = buildSalesSummary(
      event,
      [
        { id: "tt-a", name: "A", type: "paid", price_cents: 100, currency: "eur", is_hidden: false, max_capacity: 3 },
        { id: "tt-free", name: "Community", type: "free", price_cents: null, currency: "unknown", is_hidden: false, max_capacity: 1 },
      ],
      guests,
      [],
    );
    const warnings = computeWarnings(tight, { capacityPct: 90, pendingHours: 24, startSoonHours: 48 }, now);
    const codes = warnings.map((w) => w.code).sort();
    expect(codes).toContain("sold_out"); // tt-a: 3 sold / 3 capacity, Community 1/1
    expect(codes).toContain("pending_aging");
    expect(codes).toContain("pending_before_start");
  });

  it("stays quiet under thresholds and without pending guests", () => {
    const calm = buildSalesSummary(event, ticketTypes, normalizeGuests({ entries: [paidGuest, freeGuest] }), []);
    expect(computeWarnings(calm, { capacityPct: 90, pendingHours: 24, startSoonHours: 48 }, now)).toEqual([]);
  });

  it("respects the capacity threshold boundary", () => {
    const s = buildSalesSummary(
      event,
      [{ id: "tt-paid", name: "General", type: "paid", price_cents: 100, currency: "eur", is_hidden: false, max_capacity: 5 }],
      normalizeGuests({ entries: [paidGuest, uncapturedGuest, multiCurrencyGuest] }),
      [],
    );
    // 4 tickets (multi holds 2) / 5 seats = 80%
    expect(computeWarnings(s, { capacityPct: 81, pendingHours: 24, startSoonHours: 48 }, now)).toEqual([]);
    expect(computeWarnings(s, { capacityPct: 80, pendingHours: 24, startSoonHours: 48 }, now).map((w) => w.code)).toEqual([
      "near_capacity",
    ]);
  });

  it("fires sold_out when multi-ticket guests fill capacity with fewer guests", () => {
    const twoSeats = {
      api_id: "gst-2seats",
      email: "pair@example.com",
      approval_status: "approved",
      event_tickets: [
        { api_id: "s1", name: "General", amount: 2500, currency: "eur", is_captured: true, event_ticket_type_id: "tt-cap" },
        { api_id: "s2", name: "General", amount: 2500, currency: "eur", is_captured: true, event_ticket_type_id: "tt-cap" },
      ],
    };
    const s = buildSalesSummary(
      event,
      [{ id: "tt-cap", name: "General", type: "paid", price_cents: 2500, currency: "eur", is_hidden: false, max_capacity: 2 }],
      normalizeGuests({ entries: [twoSeats] }),
      [],
    );
    expect(computeWarnings(s, { capacityPct: 90, pendingHours: 24, startSoonHours: 48 }, now).map((w) => w.code)).toEqual([
      "sold_out",
    ]);
  });
});

describe("renderers", () => {
  it("renders a sales digest with revenue, capacity, and coupons", () => {
    const md = renderSalesMd(summary);
    expect(md).toContain("Test Conference");
    expect(md).toContain("40.00 EUR gross");
    expect(md).toContain("| SAVE20 | 2 | 1 |");
    expect(md).toContain("2 paid");
  });

  it("neutralizes control chars and pipes in API-derived names (mdSafe)", () => {
    expect(mdSafe("Evil\n# Fake heading")).toBe("Evil # Fake heading");
    expect(mdSafe("cell|breaker")).toBe("cell\\|breaker");
    // A registrant-supplied backslash must not consume our own `|` escape:
    // `a\|b` has to stay a literal, never become a live cell break.
    expect(mdSafe("a\\|b")).toBe("a\\\\\\|b");
    expect(mdSafe("C:\\Users")).toBe("C:\\\\Users");
    expect(mdSafe("  padded name ")).toBe("padded name");
    const hostile = {
      ...paidGuest,
      guest: { ...paidGuest.guest, user_name: "Injected\n\n# Totals: 0 EUR |x|" },
    };
    const s = buildSalesSummary(event, ticketTypes, normalizeGuests({ entries: [hostile] }), []);
    const md = renderSalesMd({ ...s, event: { ...s.event, name: "Line1\nLine2" } });
    expect(md).toContain("# Sales report — Line1 Line2");
  });

  it("renders calendar totals across events without mixing currencies", () => {
    const cal = buildCalendarSales({ after: "", before: "" }, [summary, summary]);
    expect(cal.totals.find((t) => t.currency === "eur")!.gross_cents).toBe(8000);
    const md = renderCalendarSalesMd(cal);
    expect(md).toContain("80.00 EUR gross");
    expect(md).toContain("140.00 USD gross");
  });
});
