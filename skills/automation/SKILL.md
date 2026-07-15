---
name: automation
version: 1.0.0
description: >
  Luma read-only reporting + unattended automation — revenue/sales summaries, accounting/CRM roster exports,
  change digests (diff), capacity/approval-queue checks, and Luma↔Stripe payment reconciliation, plus the
  scheduling recipes (cron / launchd / Windows Task Scheduler / GitHub Actions) that run them hands-free.
  Sub-skill of `luma:`. Load only after the parent `luma` skill has matched (user explicitly said "luma" / "lu.ma")
  and the task is reporting, revenue/accounting, exports, digests, reconciliation, or scheduled/unattended Luma jobs.
---

# Luma — Reporting & Automation

Read-only commands built for unattended schedules. CLI prefix: `node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js"`.

## STOP — the automation boundary

Every command in this skill is **Read-tier**: it never mutates Luma or Stripe and never emails anyone, so it is safe for cron.
**Never wire a schedule to Write/Send/Destroy operations** (approve, decline, send-invites, add-guests, cancel) — the parent
skill's safety model requires a human approval for those, and "the digest showed 5 pending, auto-approve them" is exactly the
improvisation this boundary forbids. Admin commands (`event guest-timeline` etc.) use an EXPIRING session cookie — never put
them in unattended jobs; public-API-key commands only.

## Coverage — chore → command

| Chore | Command |
|---|---|
| Revenue summary for one event | `report sales --event-id evt-X [--format md]` |
| Whole-calendar revenue (monthly close) | `report sales --calendar --after <iso> --before <iso>` |
| Accounting / CRM export (CSV) | `report roster --event-id evt-X --out roster.csv [--paid-only] [--status approved]` |
| "What changed since last run?" digest | `report roster --format json --out today.json` + `report diff yesterday.json today.json` |
| Sellout / approval-queue alerting | `report check --event-id evt-X` (exit 3 on warnings) |
| Do Luma payments match my Stripe account? | `stripe reconcile --event-id evt-X [--since <iso>] [--check]` |

All support `--format json|md` (roster: `csv|json`) and `--out <file>` (atomic write: temp file + rename, a crashed run never
truncates yesterday's artifact).

## Money semantics (load-bearing — from real accounting incidents)

- A guest is **paid** iff any of their tickets has `is_captured && amount > 0`. `amount > 0` alone includes abandoned
  checkouts (reported separately as `uncaptured`); comped guests have `amount: 0`. **Never** infer payment from ticket-type
  names. Approval status is an independent axis.
- Amounts are **integer cents** as reported by Luma, with a **nullable currency** (bucketed as `unknown`). Totals are always
  per-currency and never summed across currencies or assumed USD.
- Coupon `discount_cents` counts **captured** orders only; `uses` counts every order that referenced the code.
- Output is **deterministic** (sorted rows, no volatile fields like `check_in_qr_code`) so two runs diff cleanly. Do not add
  timestamps or rotating URLs to report output — that breaks `report diff` and git-based history for every user.

## Stripe reconciliation

Luma routes card payments as charges into the **organizer's own connected Stripe account** and stamps
`metadata.luma_payment_started_api_id` on them (observed behavior, not documented by Luma). `stripe reconcile`:

1. pulls this event's paid guests, 2. lists your Stripe charges since `--since` (default: event `created_at`),
3. keeps Luma-stamped succeeded charges, 4. matches by **normalized email only** (amount differences are flagged, never used
   to match), 5. buckets: `matched` (with mismatch/refund flags), `luma_paid_no_charge`, `charge_no_guest`.

Caveats to relay to the user: charges are account-wide, so `charge_no_guest` may simply be another event (narrow with
`--since`); guests who pay with a different email than they registered with show up as a no-charge + no-guest pair; if the
page cap is hit the report says INCOMPLETE. Needs `STRIPE_API_KEY` — tell the user to create a **restricted read-only key**
(`rk_...`) at dashboard.stripe.com/apikeys; store with `auth set-key <luma-key> --stripe-key rk_...`.

## Exit-code contract (for schedulers)

| Exit | Meaning |
|---|---|
| 0 | Clear / report produced |
| 1 | Fatal (auth, network after retries, bad input) — scheduler keeps yesterday's artifact |
| 3 | Warnings/anomalies found (`report check` always; `stripe reconcile` only with `--check`) |

`report diff --format md` prints **nothing** when nothing changed, so `... | mail -s "Luma digest" you@example.com`
stays silent on quiet days. JSON formats always print.

## Scheduling

Copy-paste templates live in `examples/` (cron, launchd, Windows Task Scheduler via `Register-ScheduledTask`, GitHub
Actions) with the full recipe in `docs/automation.md`. Rules of thumb: one scheduled job per API key, serial (calendar keys are 200 req/min shared with your
interactive use); hourly is plenty; `--calendar` mode over many events is O(events × guest pages) — schedule it weekly.
**PII warning:** rosters and diffs contain attendee names/emails — never commit them to a public repo; in GitHub Actions use
a private repo or artifacts, and pass keys via Actions secrets.

## Live-validation checklist (API access required)

These commands were built against Luma's published OpenAPI spec and fixture tests. On first use with a live key, sanity-check
once before trusting unattended output: run `report sales` on an event whose revenue the user knows, and confirm the totals
match the Luma dashboard before wiring the schedule.
