---
name: calendar
version: 1.0.0
description: >
  Luma calendar — config, list-events, list-people, lookup-event, submissions (add/approve/reject), import-people, admins.
  Sub-skill of `luma:`. Load only after the parent `luma` skill has matched (user said "luma" / "lu.ma") and the task is calendar-scoped (not a single event).
---

# Luma — Calendar

Covers `/v1/calendar/*` excluding tags and coupons. For tags use `luma:tags`. For coupons use `luma:ticketing`. For multi-calendar org operations use `luma:organizations`.

CLI prefix: `node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar <action>`.

## Coverage

| Endpoint | Action |
|---|---|
| `GET /v1/calendar/get` | `calendar get` |
| `GET /v1/calendar/admins-list` | `calendar admins-list` |
| `GET /v1/calendar/list-events` | `calendar list-events` |
| `GET /v1/calendar/list-people` | `calendar list-people` |
| `GET /v1/calendar/lookup-event` | `calendar lookup-event --url <...>` |
| `POST /v1/calendar/add-event` | `calendar add-event --body @...` |
| `POST /v1/calendar/approve-event` | `calendar approve-event --calendar-event-id calev-X` |
| `POST /v1/calendar/reject-event` | `calendar reject-event --calendar-event-id calev-X --message "..."` |
| `POST /v1/calendar/import-people` | `calendar import-people --body @people.json` |

## Calendar info

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar get          # name, slug, tint, description
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar admins-list  # who can manage it
```

## List events

```bash
# All approved events (default)
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar list-events --all

# Date window
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar list-events \
  --after 2026-01-01T00:00:00Z --before 2026-12-31T23:59:59Z --all

# Include external (cross-calendar) events
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar list-events --platforms '["luma","external"]' --all

# Pending submissions (third-party events waiting on approval)
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar list-events --status pending --all
```

Sort: `--sort-column start_at`, `--sort-direction asc|desc`.

## List people (members + attendees)

```bash
# Search by name/email
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar list-people --query alice --all

# Filter by tag(s)
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar list-people --tags '["vip","sponsor"]' --all

# Filter by membership tier + status
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar list-people \
  --calendar-membership-tier-id memt-XXXX --member-status approved --all

# Sort
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar list-people \
  --sort-column event_checked_in_count --sort-direction desc --all
```

Sort columns: `created_at | event_checked_in_count | event_approved_count | name | revenue_usd_cents`.

## Lookup event (by URL or external ID)

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar lookup-event --url https://lu.ma/your-event-slug
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar lookup-event --event-id evt-XXXX
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar lookup-event --platform external --url https://example.com/...
```

Useful for de-duping before `event create`.

## Submissions (third-party events on the calendar)

`add-event`, `approve-event`, `reject-event` apply to submissions from non-admin users (e.g., a community member proposing an event for your calendar).

```bash
# Submit a new event to this calendar (body matches the event create schema)
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar add-event --body @event.json

# Approve a pending submission (`calev-` ID, or `evt-` will be resolved)
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar approve-event --calendar-event-id calev-XXXX

# Reject with optional explanation
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar reject-event \
  --calendar-event-id calev-XXXX \
  --message "Outside the calendar's current scope — happy to revisit later."
```

`approve-event` posts the event to the calendar publicly. `reject-event` emails the submitter if `message` is set.

## Import people (bulk add to calendar audience)

```bash
cat > /tmp/people.json <<JSON
{
  "infos": [
    {"email":"alice@example.com","name":"Alice"},
    {"email":"bob@example.com",  "name":"Bob"}
  ],
  "tag_names": ["sponsor","cycle-12"]
}
JSON
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar import-people --body @/tmp/people.json
```

`tag_names` only attach **existing** tags. Create new tags first via `luma:tags` (`calendar event-tags-create` / `create-person-tag`).

`import-people` does **not** email the people — they're added quietly to the calendar audience. Subscribing them to events still requires `event add-guests` (which does send mail).

## Safety

- `approve-event` makes the submission publicly visible on the calendar. Confirm the event meets brand/scope before approving.
- `reject-event` with `--message` emails the submitter; treat as a send action.
- `import-people` is silent (no email) but adds them to the audience — confirm the recipient list before bulk imports of cold contacts.
