---
name: webhooks
version: 1.0.0
description: >
  Luma webhooks — CRUD + the complete event-type catalog and payload shapes for all 9 webhook events.
  Sub-skill of `luma:`. Load only after parent `luma` skill matched (user said "luma" / "lu.ma") and the task is Luma webhook subscriptions or consuming Luma webhook payloads (NOT Stripe / GitHub / generic webhook setup).
---

# Luma — Webhooks

Subscribe to Luma platform events; each webhook fires `POST <your-url>` with a JSON envelope.

CLI prefix: `node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" webhooks <action>`.

## Coverage

| Endpoint | Action |
|---|---|
| `GET /v1/webhooks/list` | `webhooks list` |
| `GET /v1/webhooks/get` | `webhooks get --id wh-X` |
| `POST /v1/webhooks/create` | `webhooks create --url <https> --event-types '[...]'` |
| `POST /v1/webhooks/update` | `webhooks update --id wh-X --event-types '[...]' --status active|paused` |
| `POST /v1/webhooks/delete` | `webhooks delete --id wh-X` |

## Event types

| Event type | Fires when |
|---|---|
| `*` | Wildcard — all events below |
| `event.created` | New event added to the calendar |
| `event.updated` | Event details changed |
| `event.canceled` | Event canceled |
| `guest.registered` | Someone registers for an event |
| `guest.updated` | Guest approval status / answers change |
| `ticket.registered` | Paid ticket purchased |
| `calendar.event.added` | Third-party submission appears on the calendar |
| `calendar.person.subscribed` | Someone subscribes to the calendar |

## CRUD

```bash
# List
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" webhooks list --all

# Create — single event type
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" webhooks create \
  --url https://example.com/luma-webhook \
  --event-types '["guest.registered"]'

# Create — multiple
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" webhooks create \
  --url https://example.com/luma-webhook \
  --event-types '["event.created","event.updated","event.canceled"]'

# Create — wildcard (all events)
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" webhooks create \
  --url https://example.com/luma-webhook \
  --event-types '["*"]'

# Get one
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" webhooks get --id wh-XXXX

# Pause / resume / change event types
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" webhooks update --id wh-XXXX --status paused
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" webhooks update --id wh-XXXX --status active
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" webhooks update --id wh-XXXX --event-types '["guest.registered","ticket.registered"]'

# Delete
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" webhooks delete --id wh-XXXX
```

`url` must be HTTPS and publicly reachable. Luma sends a verification ping at create-time; if it fails, create returns 400.

## Payload envelope

Every delivery posts `{ "type": "<event-name>", "data": { ... } }`. That's it — no top-level `api_id`, no `created_at`, no separate signature header documented. Return any `2xx` (empty body is fine) to acknowledge.

```json
{ "type": "guest.registered", "data": { /* per-type payload below */ } }
```

## Payload shapes by event type

`event.created` / `event.updated` / `event.canceled` — identical schema; differentiate by `type`:

```json
{
  "platform": "luma",
  "id": "evt-...",
  "user_id": "usr-...",
  "calendar_id": "cal-...",
  "start_at": "2030-06-12T17:00:00.000Z",
  "end_at":   "2030-06-12T20:00:00.000Z",
  "duration_interval": "PT3H",
  "created_at": "2030-05-13T...",
  "timezone": "America/Chicago",
  "name": "...",
  "description": "...",
  "description_md": "...",
  "geo_address_json": {
    "address":"...", "city":"...", "region":"...", "country":"...",
    "city_state":"...", "full_address":"...", "description":"...",
    "google_maps_place_id":"...", "apple_maps_place_id":"..."
  },
  "coordinate": { "latitude": 40.71, "longitude": -74.01 },
  "meeting_url": "...",
  "cover_url": "...",
  "registration_questions": [{ "id":"...", "label":"...", "required":true, "question_type":"agree-check" }],
  "url": "https://lu.ma/...",
  "visibility": "public",
  "feedback_email": { "enabled": true, "delay": "P1D" },
  "tags": [{ "id":"tag-...", "name":"workshop" }]
}
```

`coordinate` is `null` for online events or addresses that fail to geocode. `geo_latitude`/`geo_longitude` are legacy — use `coordinate`.

`guest.registered` / `guest.updated`:

```json
{
  "id": "g-...",
  "user_id": "usr-...",
  "user_email": "alice@example.com",
  "user_name": "Alice",
  "user_first_name": "Alice",
  "user_last_name": "...",
  "approval_status": "approved|session|pending_approval|invited|declined|waitlist",
  "check_in_qr_code": "...",
  "eth_address": null,
  "solana_address": null,
  "phone_number": null,
  "invited_at":   null,     // null if guest self-registered
  "joined_at":    null,     // only set for online events when guest clicks the join link
  "registered_at": "...",
  "registration_answers": [{ "question_id":"...", "question_type":"agree-check", "answer":"..." }],
  "utm_source": "...",      // from ?utm_source= in registration URL
  "custom_source": null,    // deprecated → use utm_source
  "event_tickets": [{
    "id":"tkt-...", "api_id":"tkt-...",
    "name":"Workshop ticket",
    "amount":1500, "amount_discount":300, "amount_tax":0,
    "currency":"USD",
    "event_ticket_type_id":"ett-...",
    "is_captured":true,
    "checked_in_at": null
  }],
  "event_ticket_orders": [/* inspect coupon_info per order */],
  "event": { /* full event object, same shape as event.created above */ }
}
```

`ticket.registered` — same fields as `guest.registered`, plus a single `event_ticket` (object, not array):

```json
{
  "event_ticket": {
    "id":"tkt-...",
    "name":"Workshop ticket",
    "amount":1500, "amount_discount":300, "amount_tax":0,
    "currency":"USD",         // ISO codes; also accepts solana_sol, solana_usdc
    "event_ticket_type_id":"ett-...",
    "is_captured":true,
    "checked_in_at": null
  }
  /* ...plus everything from guest.registered */
}
```

`calendar.event.added` — fires when an event is added/submitted to a calendar:

```json
{
  "platform": "luma",
  "id": "evt-...",
  "name": "...",
  "url": "https://lu.ma/...",
  "cover_url": "...",
  "start_at": "...",
  "end_at": "...",
  "timezone": "America/Chicago",
  "calendar": {
    "id":"cal-...", "name":"...", "slug":"...", "avatar_url":"...",
    "url":"...", "description":"...", "coordinate":null, "location":"...",
    "cover_image_url":"...", "social_image_url":"...",
    "is_personal":false,
    "twitter_handle":"...", "instagram_handle":"...", "youtube_handle":"...",
    "website":"..."
  },
  "hosts": [{ "id":"usr-...", "name":"...", "avatar_url":"..." }]
}
```

`calendar.person.subscribed`:

```json
{
  "id": "usr-...",
  "email": "alice@example.com",
  "created_at": "...",
  "event_approved_count": 0,
  "event_checked_in_count": 0,
  "revenue_usd_cents": 0,
  "tags": [{ "id":"tag-...", "name":"vip" }],
  "user": { "id":"usr-...", "name":"...", "first_name":"...", "last_name":"...", "email":"...", "avatar_url":"..." },
  "membership": null
}
```

## Delivery

- Luma retries non-2xx responses (exact policy not publicly documented; assume exponential backoff over hours).
- Return any `2xx`; an empty body is accepted.
- Differentiate retries from new events by `(type, data.id)` — Luma does **not** stamp a top-level delivery ID on the envelope, so dedupe on the inner payload's stable IDs (e.g. `data.id` for a guest, `data.id` for an event).

## Safety

- `webhooks delete` immediately stops delivery — no warning emails. For temporary disables prefer `update --status paused`.
- Webhook URLs are publicly reachable endpoints — protect with a shared secret you bake into the URL path or a header your endpoint checks. Luma does not publish a documented signature header at this time.
