---
name: event
version: 1.0.0
description: >
  Luma event lifecycle — create, get, update, cancel a Luma event, and manage hosts on it.
  Sub-skill of `luma:`. Load only when the parent `luma` skill has already matched (user explicitly said "luma" / "lu.ma") and the task is event lifecycle, not RSVPs (→ `luma:guests`) or pricing (→ `luma:ticketing`).
---

# Luma — Event lifecycle

Covers `/v1/event/*` CRUD + hosts. For RSVPs/guests/invites use `luma:guests`. For ticket types and coupons use `luma:ticketing`.

CLI prefix: `node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event <action>`. Add `--raw` for compact JSON, `--all` to auto-paginate.

## Coverage

| Endpoint | Action |
|---|---|
| `GET /v1/event/get` | `event get --id evt-XXXX` |
| `POST /v1/event/create` | `event create` |
| `POST /v1/event/update` | `event update --event-id evt-XXXX ...` |
| `POST /v1/event/cancel/request` | `event cancel-request --event-id evt-XXXX` |
| `POST /v1/event/cancel` | `event cancel --event-id ... --cancellation-token ... --should-refund ...` |
| `POST /v1/event/hosts/create` | `event hosts-create --event-id ... --email ...` |
| `POST /v1/event/hosts/update` | `event hosts-update --event-id ... --email ...` |
| `POST /v1/event/hosts/remove` | `event hosts-remove --event-id ... --email ...` |

## Get event

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event get --id evt-XXXXXXXX
```

Common response fields under `event`: `api_id`, `name`, `url` (already a full short URL like `https://luma.com/abc123xy` — don't re-prefix), `start_at`, `end_at`, `timezone`, `visibility`, `description_md`, `max_capacity`, `require_approval`, `geo_address_json`.

## Loading file content into a flag

Any string flag — `--description-md`, `--name`, `--geo-address-json`, etc. — accepts `@<path>` to read from a file or `-` to read from stdin. Use this for multi-line markdown to keep commands portable across zsh / bash / PowerShell:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event update \
  --event-id evt-XXXX \
  --description-md @./desc.md \
  --suppress-notifications true
```

## Cover image upload (three-step)

Luma doesn't accept a local file directly. Upload to S3 first, then pass the resulting URL.

```bash
# Step 1 — get a signed upload URL
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" images create-upload-url --content-type image/png
# returns { upload_url: "https://s3....", file_url: "https://images.lumacdn.com/api-uploads/..." }

# Step 2 — PUT the file to S3
curl -s -o /dev/null -w "%{http_code}" -X PUT \
  -H "Content-Type: image/png" \
  --data-binary @./my-poster.png \
  "<upload_url>"
# expect 200

# Step 3 — set it as the event cover
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event update \
  --event-id evt-XXXX \
  --cover-url "<file_url>" \
  --suppress-notifications true
# returns {} on success
```

Each `create-upload-url` call returns a unique URL. If updating multiple events, request one upload URL per file (even if the same image goes to multiple events, each needs its own upload).

To render an HTML poster/cover to PNG before uploading, use any headless-browser screenshot tool (e.g. Playwright or Puppeteer).

## Create event

Top-level scalars work as flags; for `coordinate`, `geo_address_json`, `registration_questions`, `feedback_email`, pass `--body` with the full JSON.

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event create \
  --name "Community Workshop 1: Intro to AI" \
  --start-at 2030-06-12T17:00:00.000Z \
  --end-at 2030-06-12T20:00:00.000Z \
  --timezone America/Chicago \
  --visibility public \
  --max-capacity 40 \
  --description-md @./workshop-description.md \
  --geo-address-json '{"type":"manual","address":"123 Main St, Springfield, IL 62701"}' \
  --tint-color "#4F46E5"
```

Required: `name`, `start_at`, `timezone`. `visibility` is `public|members-only|private`. `name_requirement` is `full-name|first-last`. `phone_number_requirement` is `optional|required`. Cover images must be uploaded first via `images create-upload-url`.

For complex bodies:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event create --body @event.json
```

## Update event

Identical flags to create, plus `--event-id` and `--suppress-notifications true` to skip guest emails on time/location/name changes. Everything else is optional — pass only what you're changing.

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event update \
  --event-id evt-XXXX \
  --max-capacity 60 \
  --suppress-notifications true
```

Returns `{}` on success (not the updated event object). To verify a change landed, re-fetch with `event get --id evt-XXXX` and diff the field you wrote.

When updating `description_md`, fetch the current value first (`event get`), edit that text, and push the result — never regenerate the description from memory, or you will silently clobber edits made by other hosts or in the Luma UI.

## Cancel event (two-step)

Luma requires a cancellation token. Request → confirm.

```bash
# Step 1 — request token (always safe; no notifications sent yet)
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event cancel-request --event-id evt-XXXX
# returns { cancellation_token: "...", paid_guest_count: N, ... }

# Step 2 — confirm. Requires --should-refund decision iff paid_guest_count > 0
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event cancel \
  --event-id evt-XXXX \
  --cancellation-token <token-from-step-1> \
  --should-refund true
```

Cancellation **emails every guest**. Show the recipient count from step 1 and wait for the user's explicit "cancel" before running step 2.

## Hosts

Access levels: `none` (revoke), `check-in` (door staff), `manager` (full). The event creator's level cannot be changed.

```bash
# add
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event hosts-create \
  --event-id evt-XXXX --email jordan@example.com \
  --access-level manager --name "Jordan Host"

# change role / visibility
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event hosts-update \
  --event-id evt-XXXX --email jordan@example.com \
  --access-level check-in --is-visible false

# remove
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event hosts-remove \
  --event-id evt-XXXX --email jordan@example.com
```

## Common patterns

```bash
# Find event by URL/slug (before creating to check duplicates)
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" entity lookup --slug your-event-slug
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar lookup-event --url https://lu.ma/your-event-slug

# Pre-flight: confirm capacity changes don't go below current approved count
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event get-guests --event-id evt-XXXX --approval-status approved --all \
  | jq '.entries | length'
```

## Safety

- `cancel` and `update` (when name/time/location changes) email every approved guest. Get explicit approval first.
- Use `--suppress-notifications true` for cosmetic edits (typo, cover image, capacity) so guests don't get spurious update emails. Cover image updates ALWAYS need `--suppress-notifications true`.
- Pre-existing rule: never delete or cancel an event without confirming the paid-guest refund decision.
- After any write action (`event update`, `event create`, `add-guests`, etc.), verify the change landed: re-fetch via the API and diff the field you wrote; if a browser tool is available, also check the live event page. API success does not guarantee UI correctness.

## When creating a paid event, set ticket positions correctly from the start

`event create` itself doesn't take ticket types — you create them afterwards via `luma:ticketing`. But before you mass-invite anyone, run through this checklist:

1. Paid tiers (Early Bird / Full / Member): positions 1–90, visible.
2. Free comp tiers (Sponsor / VIP / Speaker): positions 91+, `is_hidden: true`, `require_approval: true`.
3. Verify with `luma event ticket-types-list --event-id evt-XXX`. The first row in the response is what's pre-selected on the public registration page.
4. If a free ticket is at a lower position than any paid ticket, FIX before sharing the URL or running any guest-add operation.

This isn't aesthetics — `add-guests` uses the lowest-position ticket as the default comp, so a misordered free tier turns every invite into a free seat. This is exactly how the mass-comp incident described in `luma:guests` happened.
