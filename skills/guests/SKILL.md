---
name: guests
version: 1.0.0
description: >
  Luma guests / RSVPs — list, get, add, approve, decline, waitlist, and send invites for a Luma event.
  Sub-skill of `luma:`. Load only after the parent `luma` skill has matched (user explicitly said "luma" / "lu.ma") and the task is RSVPs / guest list management.
---

# Luma — Guests & RSVPs

Covers `/v1/event/get-guest{,s}`, `/v1/event/add-guests`, `/v1/event/update-guest-status`, `/v1/event/send-invites`. For ticket types / coupons see `luma:ticketing`.

CLI prefix: `node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event <action>`.

## STOP — Pick the right endpoint for "invite"

The four endpoints below are NOT interchangeable. Choosing the wrong one comps everyone, fires hundreds of emails, or both. Reference incident: 271 people accidentally comped onto a paid event via `add-guests` (see the bottom of this skill).

| User wants… | Use | Why |
|---|---|---|
| Recipients to **pay** AND go through **approval queue** | Share the public event URL via Gmail / Slack / LinkedIn (no Luma API call) | Both gates preserved |
| Recipients to **pay** but **auto-approve** (Luma-branded invite email) | `event send-invites` | Approval bypassed, payment preserved |
| Recipients to get a **free seat** with **manual approval** | Create a hidden + `require_approval: true` ticket via `luma:ticketing`; share its direct link | Approval gate active, no payment |
| Recipients to get a **free seat automatically** (VIPs, sponsors, speakers) | `event add-guests` | Bypasses both gates — comp path |

**`add-guests` is the comp endpoint, not the invite endpoint.** Per Luma's docs:
> "They will be added with the status 'Going'. By default, guests receive one ticket of the default ticket type. This process bypasses payment, so use it for comping tickets."

If the user said "invite" without saying "comp" / "free seat" / "sponsor", DEFAULT to sharing the public URL. Confirm before using `add-guests`.

## STOP — Decline fires emails

`update-guest-status` with `status: "declined"` triggers a "your invitation/registration was declined" email to the guest. Same for `approved` on previously-pending guests. This is not in the OpenAPI spec; verified empirically.

Before any bulk approve/decline:
1. Run on ONE email the user controls.
2. Wait for user to confirm the email behavior.
3. Then batch SERIAL with ≥1.2s sleeps (parallel >2 hits Luma's 200 req/min rate limit fast).

## Coverage

| Endpoint | Action |
|---|---|
| `GET /v1/event/get-guests` | `event get-guests --event-id evt-X` |
| `GET /v1/event/get-guest` | `event get-guest --event-id evt-X --email a@b.com` |
| `POST /v1/event/add-guests` | `event add-guests --body @guests.json` |
| `POST /v1/event/update-guest-status` | `event update-guest-status --body @decision.json` |
| `POST /v1/event/send-invites` | `event send-invites --event-id evt-X --guests '[...]' --message "..."` |
| `POST api.luma.com/event/admin/guest/update` (admin) | `event update-guest-name` — see below |

## Fix a guest's display name (ADMIN API)

The **public** API has no way to set a guest's name — if someone registers with a Luma account that has no name, they show as "Anonymous" and `user_name`/`first_name`/`last_name` come back `null`. The only programmatic fix is Luma's **internal** admin endpoint, which uses **cookie-session auth**, not the public API key.

```bash
# 1. Get the guest's RSVP api_id (gst-...) from the public API
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event get-guest --event-id evt-XXXX --email a@b.com | jq -r '.guest.api_id'

# 2. Set the name via the admin command (needs LUMA_AUTH_SESSION_KEY)
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event update-guest-name \
  --event-id evt-XXXX --guest-id gst-XXXX --first-name Alice --last-name Example
```

`LUMA_AUTH_SESSION_KEY` = the value of the `luma.auth-session-key` cookie from a logged-in host browser session (DevTools → Application → Cookies → luma.com). It expires — re-grab on a 401. Once set, **only the guest** can change the name afterward from their own settings page. The `--guest-id` is the per-event RSVP id (`gst-...`), not the user id (`usr-...`).

## Admin API — host-dashboard capabilities the public API lacks

All commands below hit `api.luma.com` (the internal host API) with the same `LUMA_AUTH_SESSION_KEY` cookie auth. Undocumented, can change without notice, cookie expires — fine for you-in-the-loop work, not unattended cron. All are read-only except `update-guest-name`.

| Command | Returns |
|---|---|
| `event guest-timeline --event-id evt-X --user-id usr-X` | per-guest email + registration history (sent / opened / added) |
| `event guest-payment --event-id evt-X --user-id usr-X` | per-guest payment / charge / refund detail |
| `event survey-responses --event-id evt-X` | post-event feedback + ratings |
| `event page-views --event-id evt-X [--start ISO --end ISO --timezone TZ --unit hour\|day]` | registration funnel / page-view analytics |
| `event referrals --event-id evt-X` | registration referral attribution |
| `event zoom-attendance --event-id evt-X` | actual Zoom attendance vs RSVP |
| `event recent-registrations --event-id evt-X` | most recent registrations feed |
| `event invite-overview --event-id evt-X` | invite usage / availability |
| `event get-blasts --event-id evt-X [--include-scheduled 1]` | sent + scheduled email blasts |
| `event get-reminders --event-id evt-X` | scheduled reminder emails |

`--user-id` is the guest's `user_api_id` (`usr-...`), available from `event get-guest`.

**Deliberately NOT wrapped** (write ops that email guests or move money): **blast send** (`/event/admin/...` — emails every guest), **refund**, **check-in**. Their exact payload must be captured from a real, approved invocation before shipping a command — a guessed mutation here is exactly the hazard behind the mass-comp incident below. Capture live the first time you run one under approval, then add it to `src/admin.ts`.

## List guests

```bash
# all guests, all statuses (most useful)
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event get-guests --event-id evt-XXXX --all

# filter by approval status
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event get-guests \
  --event-id evt-XXXX \
  --approval-status approved \
  --sort-column registered_at --sort-direction desc \
  --all

# search by name or email (client-side, AND-matched across space-separated terms)
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event get-guests --event-id evt-XXXX --all --search "Alice Example"
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event get-guests --event-id evt-XXXX --all --search "example.com"
```

`--search` matches any string field on each entry (name, email, ticket type, etc.). Multiple words are AND-matched — all terms must appear (in any field). Combine with `--approval-status` to narrow further.

`--approval-status`: `approved | session | pending_approval | invited | declined | waitlist`. Sort columns: `name | email | created_at | registered_at | checked_in_at`.

**Who actually paid:** a guest is a *paying* guest iff any of their `event_tickets[]` has `amount > 0` AND `is_captured: true`. `amount > 0` alone includes abandoned/uncaptured checkouts; comped guests have `amount: 0`.

## Get a single guest

Any of the identifiers below works — guest API ID (`g-...`), guest ID (`gst-...`), ticket key, or the user's email.

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event get-guest --event-id evt-XXXX --email a@b.com
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event get-guest --event-id evt-XXXX --api-id g-XXXX
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event get-guest --event-id evt-XXXX --proxy-key <QR pk param>
```

## Add guests (COMP / VIP endpoint — re-read the STOP section above)

Adds people **with status `Going` and a comped ticket of the default ticket type**. Bypasses BOTH the approval queue AND payment. Use ONLY when the user has explicitly said "comp" / "free seat" / "sponsor" / "speaker". For invites that should still pay or hit approval, this is the WRONG endpoint — see the table above.

```bash
cat > /tmp/guests.json <<JSON
{
  "event_id": "evt-XXXX",
  "guests": [
    {"email": "alice@example.com", "name": "Alice"},
    {"email": "bob@example.com",   "name": "Bob"}
  ]
}
JSON
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event add-guests --body @/tmp/guests.json
```

**Always specify the ticket type explicitly** for paid events — otherwise Luma assigns the lowest-position ticket as a comp. If that's a free Sponsor/VIP tier, every recipient lands in for free.

```json
{
  "event_id": "evt-XXXX",
  "guests": [{"email":"alice@example.com","name":"Alice"}],
  "ticket": {"event_ticket_type_id": "ett-XXXX"}
}
```

With multiple tickets per guest, use `"tickets": [...]` instead of `"ticket": {...}`. The two are mutually exclusive.

**Mandatory confirmation flow** before running:
1. State to the user: "This will comp N guests onto ticket `<name>` (€<price>). They bypass approval and payment. Each gets a confirmation email."
2. Wait for explicit "yes / send / comp them".
3. If N > 5, also share the full email list for review.

## Approve / decline / waitlist

Single guest:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event update-guest-status --body '{
  "event_id": "evt-XXXX",
  "guest": {"type":"email","email":"alice@example.com"},
  "status": "approved"
}'
```

`status`: `approved | declined`. To refund a paid guest while declining: `"should_refund": true`. `guest` can be `{"type":"email","email":...}` or `{"type":"api_id","api_id":"g-..."}`.

**Both `approved` and `declined` fire emails.** Confirmed empirically. Never bulk without testing on 1 address first.

Bulk loop, SERIAL with pacing (parallel hits 429):

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event get-guests \
  --event-id evt-XXXX --approval-status pending_approval --all \
  | jq -c '.entries[] | {event_id:"evt-XXXX", guest:{type:"api_id",api_id:.api_id}, status:"approved"}' \
  | while read body; do
      node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event update-guest-status --body "$body"
      sleep 1.2   # MANDATORY — Luma rate limit is 200/min; parallel >2 trips 429
    done
```

Mandatory protocol for bulk approve/decline:
1. Pick ONE email the user controls and run the call on just that one.
2. Show the result + ask user "did you get an email and what did it say?"
3. Only after user confirms behavior → run the serial loop above.
4. If N > 50, ask user to confirm the total once more — "this will fire N emails over ~M minutes."

## Send invites (email invitation)

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event send-invites \
  --event-id evt-XXXX \
  --guests '[{"email":"alice@example.com","name":"Alice"},{"email":"bob@example.com"}]' \
  --message "Hey — quick personal note (max 200 chars)."
```

`message` is optional and capped at 200 chars. **Always show the recipient list + the message to the user before sending.**

## Common patterns

```bash
# Count by status
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event get-guests --event-id evt-XXXX --all \
  | jq '[.entries[].approval_status] | group_by(.) | map({status: .[0], count: length})'

# Export approved guest list to CSV
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event get-guests --event-id evt-XXXX --approval-status approved --all \
  | jq -r '.entries[] | [.user_name, .user_email, .registered_at, .checked_in_at] | @csv' \
  > guests.csv
```

## Safety

- `add-guests`, `update-guest-status approved/declined`, and `send-invites` all email the affected users. Never run without the user's explicit "send" approval.
- Never use real contacts as test recipients — test on an address the user controls.
- Declining a paid guest without `should_refund` leaves their payment in place — confirm refund policy before bulk decline.
- **No `delete-guest` endpoint exists.** "Remove" / "cancel" / "delete" an invitation translates to `update-guest-status: declined` (fires email) — the only available primitive. Tell the user this trade-off before they pick.
- **Rate limit on guest mutations: ~200 req/min.** Bulk must be serial with ≥1.2s sleeps. A naïve parallel-5 batch of 271 hits 429 around request 200 and corrupts the run.

## Critical historical incidents (do not repeat)

- Real production incident (the reason this skill has STOP sections): an AI agent session used `add-guests` to "invite" 271 contacts to a paid event + 2 workshops. Every one of them landed in for free, because the default ticket was a free sponsor tier at position 9. Cleanup took half a day and fired ~542 decline emails. **`add-guests` ≠ invite.**
