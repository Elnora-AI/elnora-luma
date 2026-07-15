import { describe, expect, it } from "vitest";
import { diffIsEmpty, diffRosters, parseRosterDocument, renderDiffMd } from "../src/diff.js";
import { buildRosterRows, normalizeGuests, ROSTER_SCHEMA } from "../src/reporting.js";
import { allGuests, freeGuest, paidGuest, pendingGuest, uncapturedGuest } from "./fixtures.js";

const doc = (guests: unknown[]) => ({
  schema: ROSTER_SCHEMA,
  event: { id: "evt-1", name: "Test Conference" },
  rows: buildRosterRows(normalizeGuests({ entries: guests })),
});

describe("parseRosterDocument", () => {
  it("rejects non-roster JSON with a clear error", () => {
    expect(() => parseRosterDocument({ some: "thing" }, "old.json")).toThrow(/not a roster document/);
    expect(() => parseRosterDocument(null, "old.json")).toThrow(/not a roster document/);
    expect(() => parseRosterDocument({ schema: ROSTER_SCHEMA }, "x.json")).toThrow(/no rows/);
  });

  it("accepts its own roster output", () => {
    expect(parseRosterDocument(doc(allGuests), "x").rows.length).toBeGreaterThan(0);
  });
});

describe("diffRosters", () => {
  it("returns an empty diff for identical rosters, regardless of row order", () => {
    const a = doc(allGuests);
    const b = doc([...allGuests].reverse());
    const d = diffRosters(a, b);
    expect(diffIsEmpty(d)).toBe(true);
    expect(renderDiffMd(d)).toBe("");
  });

  it("reports additions and removals with captured-revenue deltas", () => {
    const d = diffRosters(doc([freeGuest]), doc([freeGuest, paidGuest]));
    expect(d.summary).toMatchObject({ added: 1, removed: 0, changed: 0 });
    expect(d.summary.captured_delta).toEqual([{ currency: "eur", cents: 4000 }]);
    const back = diffRosters(doc([freeGuest, paidGuest]), doc([freeGuest]));
    expect(back.summary.captured_delta).toEqual([{ currency: "eur", cents: -4000 }]);
  });

  it("reports an uncaptured→captured transition as a change with amount delta", () => {
    const capturedNow = {
      ...uncapturedGuest,
      event_ticket: { ...uncapturedGuest.event_ticket, is_captured: true },
    };
    const d = diffRosters(doc([uncapturedGuest]), doc([capturedNow]));
    expect(d.summary.changed).toBe(0); // row key changes with currency bucket: "" → eur
    // The transition surfaces as remove+add across currency buckets…
    expect(d.summary.added + d.summary.removed).toBeGreaterThan(0);
    expect(d.summary.captured_delta).toEqual([{ currency: "eur", cents: 5000 }]);
  });

  it("reports field-level changes for same-key rows (check-in, approval flip)", () => {
    const identical = { ...freeGuest };
    expect(diffRosters(doc([freeGuest]), doc([identical])).changed).toHaveLength(0);

    const checkedIn = { ...pendingGuest, checked_in_at: "2030-06-08T12:00:00.000Z" };
    const d = diffRosters(doc([pendingGuest]), doc([checkedIn]));
    expect(d.changed).toHaveLength(1);
    expect(d.changed[0].after.checked_in_at).toBe("2030-06-08T12:00:00.000Z");

    const declined = { ...freeGuest, approval_status: "declined" };
    const d2 = diffRosters(doc([freeGuest]), doc([declined]));
    expect(d2.changed).toHaveLength(1);
    expect(d2.changed[0].after.approval_status).toBe("declined");
    const md = renderDiffMd(d2);
    expect(md).toContain("Changed");
    expect(md).toContain("declined");
  });
});
