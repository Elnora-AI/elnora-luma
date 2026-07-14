/**
 * Luma ADMIN API commands (api.luma.com) — NOT in the public OpenAPI spec.
 *
 * These hit Luma's internal host dashboard API with COOKIE-SESSION auth
 * (LUMA_AUTH_SESSION_KEY), not the public API key. Each endpoint was captured from
 * the host dashboard's own network traffic. The admin API is undocumented and can
 * change without notice; the session cookie expires (re-grab on a 401), so these are
 * for you-in-the-loop tasks, not unattended automation.
 *
 * Only safe-to-verify operations live here: the guest name-set (idempotent) and a set
 * of read-only GETs. Write operations that email guests or move money (blast-send,
 * refund, check-in) are intentionally omitted until their exact payload can be captured
 * from a real, approved invocation — shipping a guessed mutation is exactly how you
 * accidentally blast-email real guests.
 */
import type { Command } from "commander";
import { callLumaAdmin } from "./client.js";
import { printResult } from "./output.js";

const SESSION_HELP =
  "Needs LUMA_AUTH_SESSION_KEY — the `luma.auth-session-key` cookie from a logged-in host " +
  "browser session (DevTools → Application → Cookies → luma.com). It expires; re-grab on a 401.";

function getSessionKey(): string {
  const key = process.env.LUMA_AUTH_SESSION_KEY;
  if (!key) throw new Error(`LUMA_AUTH_SESSION_KEY is not set. ${SESSION_HELP}`);
  return key;
}

const camel = (kebab: string): string => kebab.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

interface AdminParam {
  /** CLI flag, kebab-case (e.g. "event-id") */
  flag: string;
  /** API query/body key it maps to (e.g. "event_api_id") */
  key: string;
  required?: boolean;
  desc: string;
}

interface AdminRead {
  name: string;
  path: string;
  summary: string;
  params: AdminParam[];
}

const EVENT_ID: AdminParam = { flag: "event-id", key: "event_api_id", required: true, desc: "Event API ID, e.g. evt-XXXX" };
const USER_ID: AdminParam = { flag: "user-id", key: "user_api_id", required: true, desc: "User API ID, e.g. usr-XXXX (from a guest's user_api_id)" };

// Read-only GETs — every host-dashboard capability the public API doesn't expose.
const READS: AdminRead[] = [
  {
    name: "guest-timeline",
    path: "/event/admin/get-guest-timeline",
    summary: "per-guest email + registration history (sent/opened/added)",
    params: [EVENT_ID, USER_ID],
  },
  {
    name: "guest-payment",
    path: "/event/admin/guest/get-payment-info",
    summary: "per-guest payment / charge / refund detail",
    params: [EVENT_ID, USER_ID],
  },
  {
    name: "survey-responses",
    path: "/event/analytics/survey-responses",
    summary: "post-event feedback + ratings",
    params: [EVENT_ID],
  },
  {
    name: "page-views",
    path: "/insights/event/page-views",
    summary: "registration funnel / page-view analytics over time",
    params: [
      EVENT_ID,
      { flag: "start", key: "start", desc: "ISO start, e.g. 2030-05-28T00:00:00.000Z" },
      { flag: "end", key: "end", desc: "ISO end, e.g. 2030-06-04T23:59:59.999Z" },
      { flag: "timezone", key: "timezone", desc: "IANA tz, e.g. America/New_York" },
      { flag: "unit", key: "unit", desc: "Bucket size: hour | day" },
    ],
  },
  {
    name: "referrals",
    path: "/event/admin/get-referrals",
    summary: "registration referral attribution (who drove sign-ups)",
    params: [EVENT_ID],
  },
  {
    name: "zoom-attendance",
    path: "/event/attendance/from-zoom",
    summary: "actual Zoom attendance vs RSVP",
    params: [EVENT_ID],
  },
  {
    name: "recent-registrations",
    path: "/event/admin/get-recent-registrations",
    summary: "most recent registrations feed",
    params: [EVENT_ID],
  },
  {
    name: "invite-overview",
    path: "/event/admin/get-invite-overview",
    summary: "invite usage / availability overview",
    params: [EVENT_ID],
  },
  {
    name: "get-blasts",
    path: "/event/admin/get-blasts",
    summary: "sent + scheduled email blasts",
    params: [
      EVENT_ID,
      { flag: "include-scheduled", key: "include_scheduled", desc: "Pass 1 to include scheduled blasts" },
    ],
  },
  {
    name: "get-reminders",
    path: "/event/admin/get-reminders",
    summary: "scheduled event reminder emails",
    params: [EVENT_ID],
  },
];

function registerRead(eventGroup: Command, cmd: AdminRead): void {
  const sub = eventGroup
    .command(cmd.name)
    .description(`GET api.luma.com${cmd.path} — ${cmd.summary} (ADMIN API)`);
  for (const p of cmd.params) {
    const flag = `--${p.flag} <val>`;
    if (p.required) sub.requiredOption(flag, p.desc);
    else sub.option(flag, p.desc);
  }
  sub.option("--raw", "Compact JSON output");
  sub.addHelpText("after", `\n⚠ ADMIN API (cookie auth, undocumented). ${SESSION_HELP}\n`);
  sub.action(async (opts: Record<string, string | boolean>) => {
    const sessionKey = getSessionKey();
    const query: Record<string, string | number | undefined> = {};
    for (const p of cmd.params) {
      const v = opts[camel(p.flag)];
      if (v !== undefined && typeof v !== "boolean") query[p.key] = v;
    }
    const resp = await callLumaAdmin({ sessionKey, method: "GET", path: cmd.path, query });
    printResult(resp, !!opts.raw);
  });
}

function registerUpdateGuestName(eventGroup: Command): void {
  eventGroup
    .command("update-guest-name")
    .description("POST api.luma.com/event/admin/guest/update — set a guest's display name (ADMIN API)")
    .requiredOption("--event-id <evt>", "Event API ID, e.g. evt-XXXX")
    .requiredOption("--guest-id <gst>", "Guest (RSVP) API ID — the `api_id` from `event get-guest`, e.g. gst-XXXX")
    .requiredOption("--first-name <name>", "First name")
    .requiredOption("--last-name <name>", "Last name")
    .option("--raw", "Compact JSON output")
    .addHelpText(
      "after",
      `\n⚠ ADMIN API (cookie auth). ${SESSION_HELP}\nOnce a name is set, only the guest can change it from their own settings page.\n`,
    )
    .action(async (opts: Record<string, string | boolean>) => {
      const sessionKey = getSessionKey();
      const resp = await callLumaAdmin({
        sessionKey,
        method: "POST",
        path: "/event/admin/guest/update",
        body: {
          event_api_id: opts.eventId,
          rsvp_api_id: opts.guestId,
          first_name: opts.firstName,
          last_name: opts.lastName,
        },
      });
      printResult(resp, !!opts.raw);
    });
}

/** Register all admin-API commands onto the dynamically-built `event` group. */
export function registerAdminCommands(eventGroup: Command): void {
  registerUpdateGuestName(eventGroup);
  for (const cmd of READS) registerRead(eventGroup, cmd);
}
