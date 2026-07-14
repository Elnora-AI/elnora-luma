---
name: tags
version: 1.0.0
description: >
  Luma event tags and person tags — create / update / delete / list, apply / unapply to events or people.
  Sub-skill of `luma:`. Load only after parent `luma` skill matched (user said "luma" / "lu.ma") and the task is Luma tagging (event tags for filtering events, or person tags for segmenting people).
---

# Luma — Tags (event + person)

Two parallel tag systems on a calendar:

- **Event tags** — categorize events (e.g. `workshop`, `hackathon`, `sponsored`). Filter `calendar list-events` output downstream.
- **Person tags** — categorize people (e.g. `vip`, `sponsor`, `cycle-12`). Filter `calendar list-people --tags ...`.

CLI prefix: `node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar <action>`.

## Coverage

| Endpoint | Action |
|---|---|
| `GET /v1/calendar/event-tags/list` | `calendar event-tags-list` |
| `POST /v1/calendar/event-tags/create` | `calendar event-tags-create --name ... --color ...` |
| `POST /v1/calendar/event-tags/update` | `calendar event-tags-update --tag-id tag-X --name ...` |
| `POST /v1/calendar/event-tags/delete` | `calendar event-tags-delete --tag-id tag-X` |
| `POST /v1/calendar/event-tags/apply` | `calendar event-tags-apply --tag <id|name> --event-ids '[...]'` |
| `POST /v1/calendar/event-tags/unapply` | `calendar event-tags-unapply --tag <id|name> --event-ids '[...]'` |
| `GET /v1/calendar/list-person-tags` | `calendar list-person-tags` |
| `POST /v1/calendar/create-person-tag` | `calendar create-person-tag --name ... --color ...` |
| `POST /v1/calendar/update-person-tag` | `calendar update-person-tag --tag-id tag-X --name ...` |
| `POST /v1/calendar/delete-person-tag` | `calendar delete-person-tag --tag-id tag-X` |
| `POST /v1/calendar/person-tags/apply` | `calendar person-tags-apply --tag <id|name> --emails '[...]'` |
| `POST /v1/calendar/person-tags/unapply` | `calendar person-tags-unapply --tag <id|name> --user-ids '[...]'` |

Valid `--color` values: `cranberry | barney | red | green | blue | purple | yellow | orange`.

## Event tags

```bash
# List
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar event-tags-list

# Create
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar event-tags-create --name workshop --color orange

# Update
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar event-tags-update --tag-id tag-XXXX --name "Workshop" --color orange

# Apply / unapply (accepts tag-id OR tag name)
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar event-tags-apply   --tag workshop --event-ids '["evt-AAA","evt-BBB"]'
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar event-tags-unapply --tag workshop --event-ids '["evt-AAA"]'

# Delete (also unapplies from every event)
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar event-tags-delete --tag-id tag-XXXX
```

## Person tags

```bash
# List
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar list-person-tags

# Create
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar create-person-tag --name vip --color purple

# Update
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar update-person-tag --tag-id tag-XXXX --name "VIP" --color purple

# Apply by emails OR user-ids (pick one)
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar person-tags-apply \
  --tag vip --emails '["alice@example.com","bob@example.com"]'
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar person-tags-apply \
  --tag vip --user-ids '["usr-AAA","usr-BBB"]'

# Unapply (same flags)
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar person-tags-unapply --tag vip --emails '["alice@example.com"]'

# Delete (removes the tag from every person)
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar delete-person-tag --tag-id tag-XXXX
```

## Common patterns

```bash
# Get tag ID by name (the only way to look it up — no get-tag endpoint)
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar list-person-tags | jq -r '.entries[] | select(.name=="vip") | .api_id'

# Bulk-tag everyone who attended a given event
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" event get-guests --event-id evt-XXXX --approval-status approved --all \
  | jq -r '.entries[].user.email' \
  | jq -R . | jq -s . \
  | xargs -I{} node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar person-tags-apply --tag attended-workshop-1 --emails '{}'
```

## Safety

- `delete-person-tag` / `event-tags-delete` immediately removes the tag from every person/event — no undo. Confirm scope first via `list` then `list-people --tags <name>` or `list-events` filtered downstream.
- Apply / unapply are reversible — no email side effects.
- Tag *names* are case-sensitive in lookups but the apply endpoint accepts both ID and name. Prefer ID in scripts to avoid collisions after a rename.
