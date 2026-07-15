# Unattended Luma automation

The `report` and `stripe` command groups are read-only and deterministic — built to run on a schedule and pipe their output
into whatever delivery you already have (mail, Slack webhook, git commit, artifact upload). The CLI deliberately ships **no**
email/Slack credentials and **no** daemon: composition does delivery, your OS or CI does scheduling.

## The commands

| Command | What it produces | Formats |
|---|---|---|
| `report sales --event-id evt-X` | Revenue summary: per-currency captured totals (integer cents), paid/free/uncaptured guest counts, per-ticket-type sales + capacity, coupon usage | `json` (default), `md` |
| `report sales --calendar [--after iso] [--before iso]` | The same, for every event on the calendar, plus per-currency grand totals — the monthly-close artifact | `json`, `md` |
| `report roster --event-id evt-X [--status s] [--paid-only]` | One flat row per guest per captured currency (multi-currency guests are rare; amounts are never summed across currencies) — name, email, company, payment classification, amounts, coupon, timestamps — for accounting/CRM import | `csv` (default), `json` |
| `report diff old.json new.json` | Change digest between two roster JSON files: new/removed registrations, approval flips, payment captures, check-ins, per-currency revenue delta | `md` (default), `json` |
| `report check --event-id evt-X` | Capacity/sellout + approval-queue-aging warnings with alerting exit codes | `md`, `json` |
| `stripe reconcile --event-id evt-X [--since iso] [--check]` | Luma paid guests vs the Luma-originated charges in your own Stripe account (email-keyed; mismatches and refunds flagged) | `md`, `json` |

Everything supports `--out <file>` — an **atomic** write (temp file + rename), so a run that dies mid-flight never truncates
the previous artifact.

## Exit codes (the alerting contract)

- **0** — clear, report produced.
- **1** — fatal: bad credentials, network failure after retries, malformed input. Your scheduler should keep the previous artifact.
- **3** — warnings found: always for `report check`; for `stripe reconcile` only when you pass `--check`.

`report diff --format md` prints **nothing at all** when nothing changed — `cron` + `MAILTO` (or any "mail stdout if
non-empty" wrapper) then only mails on real changes.

## Money semantics

- **paid** = at least one ticket with `is_captured && amount > 0`. Uncaptured `amount > 0` checkouts are abandoned carts —
  counted separately, never as revenue. Comped guests have `amount: 0`. Ticket-type *names* are never used.
- Amounts are integer cents as reported by Luma; `currency` is nullable and reported as `unknown` rather than assumed.
  Totals are always per-currency.
- Reports are deterministic: rows sorted, no volatile fields (QR codes, signed URLs), no embedded timestamps. Two runs over
  unchanged data are byte-identical — that's what makes `report diff` and git-diffed artifacts work.

## The stateless digest pattern

The CLI keeps **no state**. The daily digest is a two-file rotation you own:

```bash
LUMA="elnora-luma"   # or: node /path/to/bin/luma.js
DIR="$HOME/.local/state/luma-digest"; mkdir -p "$DIR"
$LUMA report roster --event-id evt-XXXX --format json --out "$DIR/today.json" || exit 1
if [ -f "$DIR/yesterday.json" ]; then
  $LUMA report diff "$DIR/yesterday.json" "$DIR/today.json" --format md
fi
mv "$DIR/today.json" "$DIR/yesterday.json"
```

Pipe that script's stdout to `mail`, a Slack webhook `curl`, or anything else. **Roster files contain attendee PII**
(names, emails, phone numbers) — keep them in a private location, never in a public repo.

## Scheduling templates

Copy-paste starters in [`examples/`](../examples):

- [`examples/luma-digest.sh`](../examples/luma-digest.sh) — the rotation above, ready for `cron` (`crontab -e`):
  `15 8 * * 1-5 /path/to/luma-digest.sh` (with `MAILTO=you@example.com` cron mails only when the digest is non-empty)
- [`examples/com.example.luma-report.plist`](../examples/com.example.luma-report.plist) — macOS launchd equivalent
- [`examples/luma-report-task.ps1`](../examples/luma-report-task.ps1) — Windows Task Scheduler registration (PowerShell `Register-ScheduledTask`)
- [`examples/github-actions-luma-report.yml`](../examples/github-actions-luma-report.yml) — GitHub Actions cron: nightly
  sales report + roster committed to a **private** repo (free history, free diffs, failure notifications built in)

## Rate-limit budgeting

Calendar API keys are limited to **200 requests/min**, shared with everything else using that key. A single-event report is
~3 requests + one per guest page (~1 per 50–100 guests). `--calendar` mode is O(events × guest pages) and runs serially by
design — schedule it weekly, not hourly, and don't point two schedulers at the same key at the same minute. The CLI retries
429/5xx with backoff automatically.

## Stripe reconciliation notes

- Create a **restricted, read-only** key (`rk_...`) at <https://dashboard.stripe.com/apikeys> — the reconcile command only
  ever issues GETs (structurally: the Stripe client has no write path), but a restricted key caps the blast radius if it
  leaks. Store it with `elnora-luma auth set-key <luma-key> --stripe-key rk_...` (config file chmod 0600 on
  macOS/Linux; on Windows chmod is effectively a no-op and the file relies on your user-profile ACLs — prefer the
  env var or an Actions secret there) or the `STRIPE_API_KEY` env var / Actions secret.
- Luma stamps `metadata.luma_payment_started_api_id` on charges it creates in your connected account. This is **observed,
  undocumented** behavior — if reconcile suddenly reports every guest unmatched, check whether Luma changed the stamp.
- Matching is by normalized email only. A guest who pays with a different email than they registered with shows up as one
  `luma_paid_no_charge` + one `charge_no_guest` entry — that's a review signal, not fraud.
- Charges are account-wide: a `charge_no_guest` entry may belong to a different event. Narrow the window with `--since`.

## What deliberately isn't here

- **No webhook listener/daemon** — Luma's webhook payloads have no documented signature scheme, and a resident server is a
  rot magnet. Poll on a schedule instead; if you operate your own endpoint, `luma webhooks create` points Luma at it.
- **No built-in email/Slack delivery** — that would mean third-party credentials inside a Luma CLI. Pipe stdout.
- **No admin-API commands in schedules** — `LUMA_AUTH_SESSION_KEY` is an expiring browser cookie; unattended use is a
  guaranteed future breakage. Public-API-key commands only.
- **No auto-approve / auto-email** — automations here are read-only by design; approval and messaging stay human-approved
  (see [SAFETY.md](../SAFETY.md)).

## Before you trust it unattended

These commands are verified against Luma's published OpenAPI spec with an extensive fixture suite. On your first run with a
live key, compare `report sales` totals against the Luma dashboard for one event you know, then wire the schedule.
