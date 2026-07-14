---
name: ticketing
version: 1.0.0
description: >
  Luma ticket types + coupons (event-level and calendar-level).
  Sub-skill of `luma:`. Load only after the parent `luma` skill has matched (user explicitly said "luma" / "lu.ma") and the task touches paid tickets, ticket type CRUD, or discount coupons.
---

# Luma — Ticket types & coupons

Covers `/v1/event/ticket-types/*` and both coupon endpoints (`/v1/event/{coupons,create-coupon,update-coupon}` and `/v1/calendar/coupons{,/create,/update}`). Calendar-level coupons apply to every event on the calendar; event-level coupons only to one.

CLI prefix: `node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js"`.

## STOP — Position ordering is a default-comp trap

Luma's public ticket picker sorts by `position` ascending and pre-selects the first one with quantity 1. **If a free ticket is at the lowest `position` on a paid event, every visitor lands with "Total: Free" pre-filled** — and `add-guests` will also auto-comp invitees onto that ticket.

**Mandatory rules for paid events with comp tiers (Sponsor / VIP / Speaker):**

| Tier | `position` | `is_hidden` | `require_approval` |
|---|---|---|---|
| Paid (Early Bird, Full, Member) | 1–90 | `false` | depends |
| Free comp (Sponsor / VIP / Speaker) | 91+ | **`true`** | **`true`** |

Reach the comp tier via a direct ticket-type link the host shares with the named recipient. Never with the public event URL.

**Audit before any mass invite:** `luma event ticket-types-list --event-id evt-XXX --include-hidden true`. If a free ticket has lower position than any paid ticket, FIX IT FIRST.

## STOP — Delete has two server-side blockers

1. **"You must have at least one visible ticket type"** — Luma 400's if the delete would leave the event with zero visible tickets (where `is_hidden: false` counts). Solution: create a placeholder visible ticket first, then delete.
2. **Issued tickets** — if guests already hold tickets of this type, you can't delete (the issued ticket records keep their `event_ticket_type_id` reference and become orphans). `is_hidden: true` is the safer pause.

To swap a ticket type cleanly:
```bash
# 1. create new
luma event ticket-types-create --body @new.json
# 2. unhide new (if it was created hidden) so it satisfies the "≥1 visible" rule
luma event ticket-types-update --body '{"event_ticket_type_id":"<new>","is_hidden":false}'
# 3. delete old
luma event ticket-types-delete --event-ticket-type-id <old>
# 4. re-hide new if intended (Luma may refuse if it's now the only ticket — accept visible)
luma event ticket-types-update --body '{"event_ticket_type_id":"<new>","is_hidden":true}'
```

Deleting a ticket type **orphans the comp pre-assignments** of all `invited` guests who had it as their default ticket (their `event_tickets` becomes `[]`). Their `approval_status` stays `invited` though — so they can still auto-approve onto whatever ticket they end up picking. The orphan alone is NOT a full neutralization; pair with `update-guest-status: declined` on the cohort (see `luma:guests`).

## STOP — Coupon terms are immutable after creation, and the API fails silently

Per Luma's spec verbatim: *"You are not able to edit the coupon terms after it has been created."* The `update-coupon` / `coupons-update` endpoints **only** mutate `code`, `remaining_count`, `valid_start_at`, `valid_end_at`. Passing a new `discount` (or `cents_off` / `percent_off`) returns `{}` with HTTP 200 and changes nothing. There is no error.

**To change a coupon's discount amount:**

1. Set `remaining_count: 0` on the old code to retire it (preserves audit history; the code string remains reserved on the calendar, so you can't reuse the exact string).
2. `coupons-create` a new code with the correct `discount`.

Confirmed live: passing a new `discount` via both the `--cents-off` flag and `--body '{"discount":{"cents_off":...,"currency":"eur"}}'` returned `{}` with HTTP 200 both times and changed nothing. The only fix is retiring the old code and creating a new one.

## Coverage

| Endpoint | Action |
|---|---|
| `GET /v1/event/ticket-types/list` | `event ticket-types-list --event-id evt-X` |
| `GET /v1/event/ticket-types/get` | `event ticket-types-get --event-ticket-type-id ett-X` |
| `POST /v1/event/ticket-types/create` | `event ticket-types-create --body @ticket.json` |
| `POST /v1/event/ticket-types/update` | `event ticket-types-update --body @ticket.json` |
| `POST /v1/event/ticket-types/delete` | `event ticket-types-delete --event-ticket-type-id ett-X` |
| `GET /v1/event/coupons` | `event coupons --event-id evt-X` |
| `POST /v1/event/create-coupon` | `event create-coupon --event-id evt-X --code ... --discount ...` |
| `POST /v1/event/update-coupon` | `event update-coupon --event-id evt-X --code ...` |
| `GET /v1/calendar/coupons` | `calendar coupons` |
| `POST /v1/calendar/coupons/create` | `calendar coupons-create --code ... --discount ...` |
| `POST /v1/calendar/coupons/update` | `calendar coupons-update --code ...` |

## Ticket types

List (default hides hidden ticket types):

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event ticket-types-list --event-id evt-XXXX
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event ticket-types-list --event-id evt-XXXX --include-hidden true
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event ticket-types-get --event-ticket-type-id ett-XXXX
```

Create / update use `--body` only (nested currency objects):

```json
{
  "event_id": "evt-XXXX",
  "name": "Workshop ticket — early bird",
  "description": "First 20 seats at discount.",
  "max_capacity": 20,
  "is_hidden": false,
  "cents": 1500,
  "currency": "USD",
  "valid_start_at": "2030-05-15T00:00:00.000Z",
  "valid_end_at":   "2030-06-08T00:00:00.000Z"
}
```

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event ticket-types-create --body @ticket.json
```

Update uses the same shape with `event_ticket_type_id` instead of `event_id`.

Delete:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event ticket-types-delete --event-ticket-type-id ett-XXXX
```

**Delete is blocked when** (a) it would leave the event with zero visible ticket types, or (b) the ticket type has issued tickets (orphans existing records). See the STOP section above for the swap-and-delete dance. To pause sales without deleting: `is_hidden: true` via update — preserves history.

## Coupons — event level

Discount is a nested object — pass via flag (JSON string) or `--body`. **`discount_type` is required** and must be `"percent"` or `"amount"` (Luma's literal enum values — `"flat"` is rejected).

```bash
# 20% off
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event create-coupon \
  --event-id evt-XXXX \
  --code EARLY20 \
  --remaining-count 50 \
  --valid-start-at 2030-05-15T00:00:00.000Z \
  --valid-end-at   2030-06-08T00:00:00.000Z \
  --discount '{"discount_type":"percent","percent_off":20}'

# Flat $5 off
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event create-coupon \
  --event-id evt-XXXX --code SAVE5 --remaining-count 100 \
  --discount '{"discount_type":"amount","cents_off":500,"currency":"usd"}'
```

`remaining-count` is the total uses; set to `1000000` for unlimited. Codes are case-insensitive, max 20 chars.

`update-coupon` can change `remaining_count`, the code string, and validity dates — **never the discount**. See the immutability STOP above.

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event update-coupon \
  --event-id evt-XXXX --code EARLY20 --remaining-count 100
```

List:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event coupons --event-id evt-XXXX --all
```

## Coupons — calendar level

Same `discount` schema; applies across every event on the calendar.

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar coupons-create \
  --code COMMUNITY10 --remaining-count 1000000 \
  --discount '{"discount_type":"percent","percent_off":10}'

node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar coupons-update --code COMMUNITY10 --remaining-count 500

node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar coupons --all
```

## Coupon math when VAT applies

Luma stores `ticket_types[].cents` **ex-VAT**, applies the coupon discount **ex-VAT**, then adds VAT on the discounted amount. So if you want the buyer to land on a target **gross** price (the bold number on the Luma checkout):

```
target_ex_VAT = target_gross / (1 + vat_rate)
cents_off     = round((current_ex_VAT - target_ex_VAT) * 100)
```

Worked example (24% VAT, ticket `cents: 36210` → €362.10 ex-VAT, target €299 gross):

- target_ex_VAT = 299 / 1.24 = 241.13
- cents_off = (362.10 − 241.13) × 100 = **12097**
- check: (362.10 − 120.97) × 1.24 = €299.00 ✓

A `discount_type: "amount"` coupon locks in the *absolute* discount; if the buyer applies it to a higher-priced ticket (e.g. Full instead of Early Bird) the gross final price drifts upward. A `discount_type: "percent"` coupon scales across tiers but rarely lands on a clean target gross. Pick based on whether the anchor is "this absolute price" or "this proportional saving."

## Safety

- Deleting / hiding a live ticket type stops new sales but does **not** refund issued tickets. Use `event update-guest-status declined --should-refund true` for refunds (see `luma:guests`).
- Coupon `remaining-count = 0` disables it immediately; cleaner than deletion for audit history. The code string stays reserved on the calendar even at zero — pick a new string for the replacement.
- Already-applied tickets keep the original coupon terms regardless of what you do to the coupon later (zero remaining or replace).
