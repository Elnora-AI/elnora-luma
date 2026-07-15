#!/usr/bin/env bash
# Daily Luma guest-change digest — stateless two-file rotation.
# Prints a markdown digest ONLY when something changed, so `cron` + MAILTO
# (or any "mail stdout if non-empty" wrapper) stays silent on quiet days.
#
# crontab example (weekdays 08:15, mail on changes):
#   MAILTO=you@example.com
#   15 8 * * 1-5 /path/to/luma-digest.sh evt-XXXX
#
# Requires: LUMA_API_KEY in the environment or ~/.config/elnora-luma/.env
set -euo pipefail

EVENT_ID="${1:?usage: luma-digest.sh evt-XXXX}"
LUMA="${LUMA_CLI:-elnora-luma}"                       # or: node /path/to/bin/luma.js
STATE_DIR="${LUMA_DIGEST_DIR:-$HOME/.local/state/luma-digest}"
mkdir -p "$STATE_DIR"

TODAY="$STATE_DIR/$EVENT_ID-today.json"
YESTERDAY="$STATE_DIR/$EVENT_ID-yesterday.json"

# Exit 1 (fatal) leaves yesterday's file untouched — no torn digests.
"$LUMA" report roster --event-id "$EVENT_ID" --format json --out "$TODAY"

if [ -f "$YESTERDAY" ]; then
  "$LUMA" report diff "$YESTERDAY" "$TODAY" --format md
fi

mv "$TODAY" "$YESTERDAY"
