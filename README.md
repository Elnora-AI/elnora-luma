# elnora-luma

The entire [Luma](https://luma.com) (lu.ma) API as a CLI and a Claude Code plugin — every one of the 61 endpoints on `public-api.luma.com`, driven directly by Luma's own OpenAPI 3.1 spec, plus the safety guardrails that stop an AI agent (or a tired human) from accidentally comping 271 people onto a paid event.

- **Complete coverage** — events, calendars, guests, ticket types, hosts, coupons, person/event tags, memberships, webhooks, organizations, images. The command tree is generated from the bundled spec at startup, so `luma spec refresh` picks up new endpoints without a code change.
- **Zero install** — the plugin ships a committed, self-contained bundle. `claude plugin install`, paste an API key, done.
- **Agent-grade safety** — hazard warnings printed on every dangerous invocation (`add-guests` is the *comp* endpoint, not the invite endpoint; declines fire emails; ticket-position ordering is a default-comp trap), draft-and-approve gates in the skills, and rate-limit-aware batching recipes.
- **Admin extras** — a hand-curated set of read-only host-dashboard commands (guest timeline, payment info, survey responses, page views, blasts) the public API doesn't expose.

## Install

### Claude Code (recommended)

```
/plugin marketplace add Elnora-AI/elnora-luma
/plugin install luma@elnora-luma
```

Then set your key (generate at [luma.com/calendar/manage/api-keys](https://luma.com/calendar/manage/api-keys) — requires Luma Plus, keys are calendar-scoped). Easiest: just tell Claude —

> set my luma api key to secret-XXXX

(the skills know the bundled CLI's path — `node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js"` — and will run `auth set-key` + `auth status` for you; the plugin itself puts no `luma` binary on your `PATH`). If you prefer to run commands yourself in a terminal, install the standalone CLI below.

That's it. Ask Claude anything Luma: "list my luma events", "who registered for the workshop on luma", "create a 20% luma coupon".

### Standalone CLI

```bash
npm install -g @elnora-ai/luma
elnora-luma auth set-key secret-XXXX
elnora-luma whoami
```

(In the plugin the binary is invoked as `node "${CLAUDE_PLUGIN_ROOT}/bin/luma.js"`; the npm global install exposes it as `elnora-luma`.)

### Any other AI coding agent

The CLI is plain JSON-on-stdout — see [AGENTS.md](AGENTS.md) for a dispatch table, and [INSTALL_FOR_AGENTS.md](INSTALL_FOR_AGENTS.md) for a copy-paste setup an agent can follow.

## Usage

```bash
luma whoami                                        # who is this API key?
luma calendar get                                  # current calendar
luma calendar list-events --all                    # every event, auto-paginated
luma event get --id evt-XXXX                       # event detail
luma event get-guests --event-id evt-XXXX --approval-status approved --all
luma event add-guests --body @guests.json          # ⚠ comp endpoint — read the hazard warning
luma webhooks create --url https://example.com/hook --event-types '["guest.registered"]'
luma spec refresh                                  # update the bundled OpenAPI spec in place
```

Every dynamic command supports `--raw` (compact JSON), `--all` (auto-paginate), `--search <term>` (client-side filter), and `--body <json|@file|->` for nested POST bodies. Run `luma` to list resources, `luma <resource>` to list actions, `luma <resource> <action> --help` for flags — generated from the spec with descriptions, enums, and required markers.

## Auth

Two credentials, resolved from the environment → `~/.config/elnora-luma/.env` (or `$LUMA_CONFIG_DIR/.env`) → a `.env` next to the CLI:

| Variable | What | Needed for |
|---|---|---|
| `LUMA_API_KEY` | Official public-API key, calendar-scoped | everything |
| `LUMA_AUTH_SESSION_KEY` | Browser session cookie (expires) | only the `event` admin commands |

The session cookie is a live login credential — read [SECURITY.md](.github/SECURITY.md) before using it. Env files are parsed with a strict 2-key allowlist and the CLI talks only to Luma's own hosts.

## Safety model

The skills enforce a four-tier model — reads are free; writes confirm scope; anything that emails people shows a draft + recipient count and waits for explicit approval; destroys show the target first. The CLI itself prints hazard warnings on stderr for the five operations that have burned real event hosts. Details and the war stories behind them: [SAFETY.md](SAFETY.md).

## Claude Code surfaces

| Surface | What it does |
|---|---|
| `luma` skill | Router — matches only explicit "luma"/"lu.ma" mentions, loads the right sub-skill |
| `luma:event` | Event lifecycle, hosts, cover-image upload |
| `luma:guests` | RSVPs, approve/decline, invites, the add-guests hazard table |
| `luma:ticketing` | Ticket types, coupons, position-ordering rules, VAT coupon math |
| `luma:calendar` | Calendar config, list events/people, submissions, import-people |
| `luma:tags` | Event + person tags CRUD and apply/unapply |
| `luma:memberships` | Paid tier membership operations |
| `luma:webhooks` | Webhook CRUD + all 9 payload shapes |
| `luma:organizations` | Multi-calendar org operations |

## Requirements

- Node.js ≥ 20
- A Luma Plus subscription (API keys are a Plus feature)

## Part of the Elnora family

Purpose-built Claude Code tools from [Elnora AI](https://elnora.ai):

- [elnora-slack](https://github.com/Elnora-AI/elnora-slack) — the entire Slack Web API as a CLI
- [elnora-linear](https://github.com/Elnora-AI/elnora-linear) — Linear workspace automation
- [elnora-google-workspace](https://github.com/Elnora-AI/elnora-google-workspace) — Gmail, Calendar, Drive, Docs, Sheets
- [elnora-whatsapp](https://github.com/Elnora-AI/elnora-whatsapp) — WhatsApp from your own account
- [knowledge-vault](https://github.com/Elnora-AI/knowledge-vault) — Obsidian vault power tools
- [elnora-merit-aktiva](https://github.com/Elnora-AI/elnora-merit-aktiva) — Merit Aktiva accounting

## Development

```bash
npm install
npm run verify   # typecheck + build + test + committed-bundle freshness
```

`dist/` is committed on purpose — the plugin runs it with zero install steps. CI fails any PR where `dist/` doesn't match a clean rebuild of `src/`.

## Contributing & License

Contributions welcome — see [CONTRIBUTING.md](.github/CONTRIBUTING.md). Security reports: [SECURITY.md](.github/SECURITY.md). Licensed under [Apache-2.0](LICENSE).
