---
name: organizations
version: 1.0.0
description: >
  Luma organizations — list org admins, list/create calendars in an org, list events across org, transfer an event between calendars.
  Sub-skill of `luma:`. Load only after parent `luma` skill matched (user said "luma" / "lu.ma") and the task is multi-calendar / organization-level Luma operations.
---

# Luma — Organizations

Multi-calendar operations. An organization owns one or more calendars; this resource is the only way to list calendars across the org or move an event between them.

The bound API key must belong to an org admin for write actions.

CLI prefix: `node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" organizations <action>`.

## Coverage

| Endpoint | Action |
|---|---|
| `GET /v1/organizations/admins/list` | `organizations admins-list` |
| `GET /v1/organizations/calendars/list` | `organizations calendars-list` |
| `POST /v1/organizations/calendars/create` | `organizations calendars-create --name ...` |
| `GET /v1/organizations/events/list` | `organizations events-list` |
| `POST /v1/organizations/events/transfer-calendar` | `organizations events-transfer-calendar --event-id ... --calendar-id ...` |

## List org admins and calendars

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" organizations admins-list
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" organizations calendars-list --all
```

## Create a new calendar in the org

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" organizations calendars-create \
  --name "Acme Community Scholars" \
  --slug acme-community-scholars \
  --description "Talks, demos, and reading groups for the community." \
  --avatar-url <https-url-from-images-upload> \
  --tint-color "#4F46E5"
```

`slug` must be unique across all of lu.ma. Check first via `entity lookup --slug ...` (returns 404 if available). If `avatar-url` is omitted, Luma assigns a default.

## List events across the whole org

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" organizations events-list \
  --after 2026-01-01T00:00:00Z --before 2026-12-31T23:59:59Z --all
```

Unlike `calendar list-events`, this aggregates every calendar the org owns. Useful for cross-cal reporting.

## Transfer an event to another calendar in the same org

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" organizations events-transfer-calendar \
  --event-id evt-XXXX \
  --calendar-id cal-YYYY
```

Both calendars must belong to the same org. Transfer keeps the event ID, guests, tickets, and host assignments. Guests are **not** notified.

## Safety

- `calendars-create` is publicly visible immediately at `lu.ma/<slug>`. Brand-check the name/avatar/tint first.
- `events-transfer-calendar` changes which audience sees the event going forward — confirm the destination calendar matches the event's intended audience before running.
- No destroy actions on this resource via API; deleting a calendar still requires the Luma dashboard.
