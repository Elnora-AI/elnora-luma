---
name: memberships
version: 1.0.0
description: >
  Luma paid calendar memberships — list tiers, add a member, approve/decline a pending member.
  Sub-skill of `luma:`. Load only after parent `luma` skill matched (user said "luma" / "lu.ma") and the task is Luma membership management (NOT subscriptions in Stripe or generic SaaS memberships).
---

# Luma — Memberships

Paid tier membership for a calendar. Lets people join a tier (free or paid) and gates `members-only` events.

CLI prefix: `node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" memberships <action>`.

## Coverage

| Endpoint | Action |
|---|---|
| `GET /v1/memberships/tiers/list` | `memberships tiers-list` |
| `POST /v1/memberships/members/add` | `memberships members-add --email ... --membership-tier-id ...` |
| `POST /v1/memberships/members/update-status` | `memberships members-update-status --user-id ... --status approved` |

## List tiers

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" memberships tiers-list --all
```

Returns `{entries: [{api_id: "memt-...", name, price_cents, currency, ...}]}`. Tier IDs (`memt-XXX`) are needed for `members-add`.

## Add a member to a tier

```bash
# Free tier
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" memberships members-add \
  --email alice@example.com \
  --membership-tier-id memt-XXXX

# Paid tier — payment is handled externally (e.g. Stripe), so set --skip-payment
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" memberships members-add \
  --email alice@example.com \
  --membership-tier-id memt-XXXX \
  --skip-payment true
```

`--skip-payment true` is **required** for paid tiers when the user has paid via Stripe or another channel — without it, Luma will reject the call.

Registration questions (if the tier defines any) go via `--body`:

```json
{
  "email": "alice@example.com",
  "membership_tier_id": "memt-XXXX",
  "skip_payment": true,
  "registration_answers": [
    {"question_api_id": "ques-XXXX", "answer": "Drug discovery"},
    {"question_api_id": "ques-YYYY", "answer": "Cycle 12"}
  ]
}
```

## Approve / decline a pending member

For tiers that require host approval (or for handling chargebacks / fraud):

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" memberships members-update-status \
  --user-id alice@example.com --status approved

node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" memberships members-update-status \
  --user-id usr-XXXX --status declined
```

`--user-id` accepts both `usr-...` and the user's email. `--status`: `approved | declined`.

## List members of a tier

There is no dedicated endpoint — pipe through `calendar list-people`:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js" calendar list-people \
  --calendar-membership-tier-id memt-XXXX \
  --member-status approved \
  --all
```

`--member-status` filter values: `approved | pending | approved-pending-payment | declined`.

## Safety

- `members-add` and `members-update-status approved` both email the user a welcome / approval notification. Confirm recipient before running.
- For paid tiers, double-check the Stripe payment has cleared before `--skip-payment true` — otherwise the user gets a free membership.
- Bulk member adds need the user's explicit "send" approval.
