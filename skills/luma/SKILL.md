---
name: luma
version: 1.0.0
description: >
  Luma API CLI — every endpoint at public-api.luma.com (61 actions across events, guests, ticket types, coupons, hosts, tags, memberships, webhooks, organizations).
  Match ONLY when the user explicitly says "luma" / "lu.ma" / "luma.com" — never on bare "event", "RSVP", "guest list", "webhook", "ticket type", "coupon", "tag", or "membership" alone, since those are claimed by other tools (Calendar, Stripe, Slack, Vanta, etc.).
  TRIGGERS (all Luma-bound, none generic): "luma", "lu.ma", "luma.com", "luma event", "luma events", "luma calendar", "luma rsvp", "luma rsvps", "luma guests", "guests on luma", "guest list on luma", "registrations on luma", "approve luma guests", "luma ticket", "luma tickets", "luma ticket type", "luma ticket types", "luma coupon", "luma coupons", "luma webhook", "luma webhooks", "luma host", "luma hosts", "luma membership", "luma memberships", "luma tier", "luma tiers", "luma tag", "luma tags", "luma person tag", "luma event tag", "luma organization", "luma api", "luma openapi", "create event on luma", "create luma event", "edit luma event", "update luma event", "cancel luma event", "add guests to luma", "send luma invites", "import people to luma", "import people on luma", "post to luma", "publish on luma", "publish to luma", "list events on luma", "hackathon on luma", "workshop on luma", "luma report", "luma sales report", "luma revenue", "luma digest", "luma automation", "scheduled luma report", "export luma guests", "luma roster", "reconcile luma", "luma stripe reconcile".
---

# Luma CLI — Router

Single binary at `"${CLAUDE_PLUGIN_ROOT}/bin/luma.js"` that reads the bundled OpenAPI spec and proxies every Luma endpoint. Auth is `LUMA_API_KEY` (see Config below). Each key is scoped to the single calendar it was generated for.

Load ONLY the sub-skill you need.

## STOP — Three rules from a real production incident

These are not stylistic. Each one cost real money / reputation. **Re-read every time before any Luma write action.**

### 1. `add-guests` is the comp-VIP endpoint, NOT the "invite" endpoint.

Per Luma's own docs (verbatim):
> "Add guests to the event. They will be added with the status 'Going'. By default, guests receive one ticket of the default ticket type. **This process bypasses payment**, so use it for comping tickets."
> "If your event or ticket has Require Approval on, inviting guests will bypass this setting. Guests who register from an invite will be automatically approved."

So `add-guests` bypasses **both** the payment gate **and** the approval gate. Every recipient is a comped VIP.

**If a user says "invite people to my Luma event":**
- DEFAULT: have them share the public event URL (e.g. via Gmail / Slack / LinkedIn). Both gates preserved.
- IF they want Luma-branded invite emails: use `send-invites` (auto-approves, but they still pay).
- ONLY use `add-guests` if the user EXPLICITLY says "comp these people" / "give them free seats" / "they're sponsors".

When in doubt, ask: "Do you want them to pay? Do you want to manually approve them?" If either answer is yes, `add-guests` is wrong.

### 2. On paid events, free tickets at the lowest `position` are a default-comp trap.

Luma orders the ticket picker by `position` ascending; the first one is auto-selected with quantity 1. If that first one is free, anyone landing on the page (whether self-arrived OR invited) sees "Total: Free" by default.

**Rule when creating paid events with comp tiers (Sponsor/VIP/Speaker):**
- Paid tiers: positions 1–90.
- Free comp tiers: positions 91+ AND `is_hidden: true`.
- Free tier reaches only the named recipient via a direct link the host shares.

Audit any event you didn't create before mass-inviting: `luma event ticket-types-list --event-id evt-XXX`. If a free ticket is at position < every paid ticket, FIX IT FIRST.

### 3. `update-guest-status: declined` FIRES decline emails. Test on 1 address first, then batch slowly.

Confirmed empirically — every `declined` call triggers a "your invitation/registration was declined" email. The OpenAPI spec doesn't mention this; it's silent server behavior.

**Before any bulk decline (or approve):**
1. Run on ONE email the user controls.
2. Have user confirm whether they got the email and what it said.
3. THEN batch — serial, ≥1.2s between calls. Parallel >2 workers triggers `429` fast.

The rate limit is 200 req/min on a calendar key. A naïve parallel-5 batch of 271 will burn through your budget and leave you in a torn-state where half are declined and half aren't.

## Config

```
LUMA_API_KEY=               # secret-... (calendar-scoped; generate at https://luma.com/calendar/manage/api-keys — requires Luma Plus)
LUMA_AUTH_SESSION_KEY=      # optional; ONLY for `event` admin commands (cookie-session auth, expires)
STRIPE_API_KEY=             # optional; ONLY for `stripe reconcile` (use a RESTRICTED read-only rk_ key)
```

Resolution order: process environment → `$LUMA_CONFIG_DIR/.env` or `~/.config/elnora-luma/.env` → `.env` next to the installed CLI. First-run setup:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" auth set-key secret-XXXX   # writes ~/.config/elnora-luma/.env (chmod 600)
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" auth status                # where the key came from + who it authenticates as
```

Header sent: `x-luma-api-key`. Base URL: `https://public-api.luma.com/v1/...`.

## Run

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" <resource> <action> [flags]
```

Pretty-printed JSON on stdout, HTTP error + Luma error body on stderr. Flags:

| Flag | Meaning |
|---|---|
| `--raw` | Compact one-line JSON |
| `--all` | Auto-paginate list endpoints (follows `next_cursor`) |
| `--body @file.json` / `-` | Send a full request body from a file or stdin; required for nested arrays/objects |
| `--<flag> @file` / `-` | Any string-typed scalar flag (e.g. `--description-md @desc.md`) reads from a file path or stdin |

Top-level scalars are also available as individual `--flag` options — `luma <res> <act> --help` shows them.

## Quick Reference

| Resource | Sub-skill | When |
|---|---|---|
| `event` (21) | `luma:event` | Create / get / update / cancel event, hosts |
| `event` (guests subset) | `luma:guests` | Add guests, approve / decline, send invites, get guest list |
| `event` + `calendar` (coupons + ticket types) | `luma:ticketing` | Paid events, ticket type CRUD, coupons (event + calendar level) |
| `calendar` (24) | `luma:calendar` | Calendar config, list events, list people, submissions (add/approve/reject), import-people, admins |
| `calendar` (tags subset) | `luma:tags` | Event tags + person tags CRUD, apply/unapply |
| `memberships` (3) | `luma:memberships` | Paid tier membership operations |
| `webhooks` (5) + payloads | `luma:webhooks` | Webhook CRUD + every event payload shape |
| `organizations` (5) | `luma:organizations` | Multi-calendar org ops (admins, list/create calendars, list/transfer events) |
| `report` (4) + `stripe` (1) | `luma:automation` | Read-only reporting: sales/revenue summaries, roster CSV export, change digests (diff), capacity/queue checks, Luma↔Stripe reconciliation, scheduling recipes |

**Invoke sub-skills via `Skill` tool — don't `Read` the SKILL.md manually.** e.g. `Skill(skill: "luma:event")`.

## Top-level utility (no sub-skill needed)

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" whoami            # alias for user get-self
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" user get-self     # API key owner + calendar
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" entity lookup --slug aloha   # check slug availability
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" images create-upload-url --content-type image/png
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" spec refresh   # updates the bundled spec in place
```

For the full cover image upload workflow (get upload URL → PUT to S3 → set cover on event), see `luma:event`.

## Conventions (apply everywhere)

- **IDs**: opaque strings. Production examples show prefixes `cal-`, `evt-`, `calev-`, `gst-`, `g-`, `usr-`, `ett-`, `tag-`, `wh-`, `memt-`, `ord-`, `tkt-`, `evtdel-` — but the docs don't enumerate them as a contract, so don't pattern-match. The `api_id` field / `*_api_id` flag variants are **deprecated across the board** — always prefer `id` / `--id` / `--event-id`.
- **Dates**: ISO 8601 UTC with milliseconds (`2026-06-08T11:00:00.000Z`), always in UTC. The `timezone` field is IANA (e.g. `America/Denver`) and stored separately — it only governs local-time display.
- **Durations**: ISO 8601 (`P[n]Y[n]M[n]DT[n]H[n]M[n]S`). `M` before `T` = months, `M` after `T` = minutes. Recommend Luxon in JS for parsing.
- **Locations**: Luma stores Google Maps `place_id` (e.g. `ChIJN1t_tDeuEmsRUsoyG83frY4`) plus optional manual `address`. Online events have `coordinate: null`.
- **Pagination**: list endpoints return `{entries, has_more, next_cursor}`. Default page size is set server-side. `--all` follows cursors and merges into `{entries, has_more:false, total}`.
- **Bodies**: any POST with nested objects/arrays (event/create, add-guests, update-guest-status, webhooks/update, import-people) needs `--body` — flags only cover top-level scalars.
- **Rate limits**: per-minute, shared across GET and POST. Calendar API keys / OAuth: **200 req/min** per calendar. Org API keys: **500 req/min** per organization. Exceed → `429`. The CLI auto-retries on 429/5xx with `Retry-After` backoff (max 3 attempts). If you start hitting 429s, batch with `--all` instead of looping list calls. Email `support@luma.com` for higher limits.

## Safety model (mandatory)

| Tier | Operations | Rule |
|---|---|---|
| **Read** | `get`, `*-list`, `*-get`, `lookup`, `whoami` | Always allowed, no confirmation |
| **Write** | `create`, `update`, `add-*`, `apply`, `import-people`, `*-tag` apply | Confirm scope (which event/calendar/people) before run |
| **Send** | `send-invites`, `add-guests` w/ new people, anything that emails users | Show draft + recipient count, wait for explicit "send" |
| **Destroy** | `delete`, `cancel`, `remove`, `unapply`, `reject` | Show the target object first; for cancel-event require `--should-refund` decision |

Never trigger an email-sending action without the user's explicit approval. `send-invites`, `add-guests`, `update-guest-status approved/declined`, `cancel`, and webhook-creation are all in scope.

**Verify writes:** After any write operation (create, update, add-guests, ticket changes), confirm the change landed — re-fetch via the API (`event get`, `ticket-types-list`) and diff the field you wrote; if a browser tool is available, also check the live event page. API success does not guarantee UI correctness (`update` returns `{}`, not the updated object).

## Discovery (when in doubt)

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js"                            # all resources
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event                      # all event actions
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event create --help        # flags for one action
```

If something looks missing, the bundled spec may be stale → `luma spec refresh`.

## Reference

- Getting started: https://docs.luma.com/reference/getting-started-with-your-api
- API conventions / formats / rate limits: `/reference/api-conventions`, `/reference/formats`, `/reference/rate-limits`
- OpenAPI 3.1 spec: https://public-api.luma.com/openapi.json (bundled at `dist/spec/openapi.json` in this plugin)
