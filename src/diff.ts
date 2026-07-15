/**
 * Pure diff between two roster JSON files produced by `report roster --format json`.
 * Stateless by design: the CLI never owns a snapshot store — the user keeps two
 * files (or git history) and pipes them back in. Luma exposes no change feed or
 * cancellation timestamp, so a keyed diff of deterministic rosters is the only
 * honest "what changed since last run".
 */
import { ROSTER_SCHEMA, type RosterRow, mdSafe, money } from "./reporting.js";

export const DIFF_SCHEMA = "elnora-luma/report-diff@1";

/** Fields whose changes are reported (API-owned, meaningful transitions). */
const DIFF_FIELDS: (keyof RosterRow)[] = [
  "approval_status",
  "payment",
  "amount_cents",
  "currency",
  "ticket_type",
  "coupon_codes",
  "checked_in_at",
];

export interface RosterDocument {
  schema: string;
  event: { id: string; name: string };
  rows: RosterRow[];
}

export interface DiffChange {
  key: string;
  email: string;
  name: string;
  before: Partial<RosterRow>;
  after: Partial<RosterRow>;
}

export interface RosterDiff {
  schema: string;
  event: { id: string; name: string };
  added: RosterRow[];
  removed: RosterRow[];
  changed: DiffChange[];
  summary: {
    added: number;
    removed: number;
    changed: number;
    captured_delta: { currency: string; cents: number }[];
  };
}

export function parseRosterDocument(raw: unknown, label: string): RosterDocument {
  const doc = raw as Partial<RosterDocument> | null;
  if (!doc || typeof doc !== "object" || typeof doc.schema !== "string" || !doc.schema.startsWith("elnora-luma/roster@")) {
    throw new Error(
      `${label}: not a roster document — expected JSON produced by \`report roster --format json\` (schema "${ROSTER_SCHEMA}").`,
    );
  }
  if (!Array.isArray(doc.rows)) throw new Error(`${label}: roster document has no rows[] array.`);
  return {
    schema: doc.schema,
    event: { id: doc.event?.id ?? "", name: doc.event?.name ?? "" },
    rows: doc.rows as RosterRow[],
  };
}

const rowKey = (r: RosterRow): string => `${r.key}|${r.currency}`;

export function diffRosters(oldDoc: RosterDocument, newDoc: RosterDocument): RosterDiff {
  const oldMap = new Map(oldDoc.rows.map((r) => [rowKey(r), r]));
  const newMap = new Map(newDoc.rows.map((r) => [rowKey(r), r]));

  const added: RosterRow[] = [];
  const changed: DiffChange[] = [];
  for (const [key, row] of newMap) {
    const prev = oldMap.get(key);
    if (!prev) {
      added.push(row);
      continue;
    }
    const before: Partial<RosterRow> = {};
    const after: Partial<RosterRow> = {};
    for (const f of DIFF_FIELDS) {
      if (prev[f] !== row[f]) {
        (before as Record<string, unknown>)[f] = prev[f];
        (after as Record<string, unknown>)[f] = row[f];
      }
    }
    if (Object.keys(after).length > 0) {
      changed.push({ key, email: row.email, name: row.name, before, after });
    }
  }
  const removed = Array.from(oldMap.entries())
    .filter(([key]) => !newMap.has(key))
    .map(([, row]) => row);

  const delta = new Map<string, number>();
  const add = (currency: string, cents: number): void => {
    if (cents === 0) return;
    delta.set(currency, (delta.get(currency) ?? 0) + cents);
  };
  for (const r of added) add(r.currency, r.amount_cents);
  for (const r of removed) add(r.currency, -r.amount_cents);
  for (const c of changed) {
    if (c.after.amount_cents !== undefined) {
      // Same row key implies same currency bucket; amount moved within it.
      const currency = (c.after.currency ?? c.before.currency ?? "") as string;
      add(currency, (c.after.amount_cents ?? 0) - ((c.before.amount_cents as number | undefined) ?? 0));
    }
  }

  return {
    schema: DIFF_SCHEMA,
    event: newDoc.event,
    added: [...added].sort((a, b) => a.key.localeCompare(b.key)),
    removed: [...removed].sort((a, b) => a.key.localeCompare(b.key)),
    changed: [...changed].sort((a, b) => a.key.localeCompare(b.key)),
    summary: {
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      captured_delta: Array.from(delta.entries())
        .map(([currency, cents]) => ({ currency, cents }))
        .sort((a, b) => a.currency.localeCompare(b.currency)),
    },
  };
}

export function diffIsEmpty(d: RosterDiff): boolean {
  return d.added.length === 0 && d.removed.length === 0 && d.changed.length === 0;
}

/** Markdown digest. Returns "" when nothing changed so cron mail pipelines
 *  (`... --format md | mail`) stay silent on quiet days. */
export function renderDiffMd(d: RosterDiff): string {
  if (diffIsEmpty(d)) return "";
  const lines: string[] = [];
  lines.push(`# Guest changes — ${mdSafe(d.event.name || d.event.id)}`);
  lines.push("");
  const deltas = d.summary.captured_delta.map((x) => money(x.cents, x.currency)).join("; ");
  lines.push(`${d.summary.added} new, ${d.summary.removed} removed, ${d.summary.changed} changed${deltas ? ` · captured revenue delta: ${deltas}` : ""}`);
  const describe = (r: RosterRow): string =>
    `${mdSafe(r.name || r.email || r.guest_api_id)}${r.email ? ` <${mdSafe(r.email)}>` : ""} — ${mdSafe(r.approval_status)}, ${r.payment}${r.amount_cents > 0 ? `, ${money(r.amount_cents, r.currency)}` : ""}`;
  if (d.added.length > 0) {
    lines.push("");
    lines.push("## New");
    for (const r of d.added) lines.push(`- ${describe(r)}`);
  }
  if (d.removed.length > 0) {
    lines.push("");
    lines.push("## Removed");
    for (const r of d.removed) lines.push(`- ${describe(r)}`);
  }
  if (d.changed.length > 0) {
    lines.push("");
    lines.push("## Changed");
    for (const c of d.changed) {
      const fields = Object.keys(c.after)
        .map((f) => `${f}: ${mdSafe(String((c.before as Record<string, unknown>)[f] ?? "∅")) || "∅"} → ${mdSafe(String((c.after as Record<string, unknown>)[f] ?? "∅")) || "∅"}`)
        .join(", ");
      lines.push(`- ${mdSafe(c.name || c.email || c.key)}: ${fields}`);
    }
  }
  return lines.join("\n") + "\n";
}
