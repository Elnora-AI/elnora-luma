# INSTALL_FOR_AGENTS.md — `elnora-luma` setup

A copy-paste setup an AI agent can walk a user through, start to finish. Target time: under 2 minutes plus the API-key fetch.

## Step 0 — Prerequisites

- Node.js ≥ 20 (`node --version`)
- A Luma account with **Luma Plus** on the calendar you want to drive (API keys are a Plus feature)
- The user must be an admin of that calendar

## Step 1 — Install

**Claude Code (plugin — zero further install):**

```
/plugin marketplace add Elnora-AI/elnora-luma
/plugin install luma@elnora-luma
```

The plugin runs a committed self-contained bundle; there is no npm install step. The binary is `node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js"` (the skills already use this form).

**Any other agent / standalone:**

```sh
npm install -g @elnora-ai/luma     # exposes `elnora-luma`
```

## Step 2 — Get the API key

Have the user open:

> https://luma.com/calendar/manage/api-keys

(Or: luma.com → their calendar → Settings → Options → API Keys.) Click **Create API Key**, copy the `secret-…` value. Each key is scoped to that one calendar — to drive several calendars, repeat with one key each and switch via `LUMA_API_KEY`.

If the page shows an upgrade prompt instead of a key button, the calendar doesn't have Luma Plus yet.

## Step 3 — Save the key

```sh
luma auth set-key secret-XXXX
```

(`luma` = `node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js"` in the plugin, `elnora-luma` standalone.) This writes `~/.config/elnora-luma/.env` with `0600` permissions. Alternatively export `LUMA_API_KEY` in the environment — the environment always wins.

## Step 4 — Smoke test

```sh
luma auth status          # where the key resolved from + who it authenticates as
luma calendar get         # the calendar this key is scoped to
luma calendar list-events --all
```

`auth status` failing with 401 → the key was mispasted or revoked; regenerate in Step 2.

## Step 5 — (Optional) admin commands

A handful of `event` commands (guest timeline, payment info, survey responses, page views, blasts, `update-guest-name`) hit Luma's internal host-dashboard API and need `LUMA_AUTH_SESSION_KEY` — the value of the `luma.auth-session-key` cookie from a logged-in host browser session (DevTools → Application → Cookies → luma.com).

**This is a live login credential, not an API key** — it grants full access to the user's Luma account and expires on its own. Only set it when the user actually needs an admin command:

```sh
luma auth set-key secret-XXXX --session-key <cookie-value>
```

Re-grab on a 401. Read [SECURITY.md](.github/SECURITY.md) for handling rules.

## Step 6 — (Optional) Stripe reconciliation

`luma stripe reconcile` cross-checks Luma paid guests against the charges Luma created in the user's own connected Stripe
account. It needs `STRIPE_API_KEY` — have the user create a **restricted, read-only** key (`rk_...`) at
<https://dashboard.stripe.com/apikeys> (the command only ever issues GETs, but a restricted key caps the blast radius):

```sh
luma auth set-key secret-XXXX --stripe-key rk_...
```

Scheduled/unattended recipes (daily digests, nightly reports, alerting exit codes): [docs/automation.md](docs/automation.md).

## Completion checklist

- [ ] `luma auth status` returns the user's identity
- [ ] `luma calendar get` returns the expected calendar
- [ ] The user knows: `add-guests` = comp (not invite), declines fire emails, and nothing that emails people runs without their explicit approval ([SAFETY.md](SAFETY.md))
