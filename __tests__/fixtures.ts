/** Shared guest/event fixtures for the reporting test-suite. Shapes mirror the
 *  bundled OpenAPI spec: entries carry fields flat AND under a nested `guest`
 *  duplicate; tickets appear as `event_tickets[]` or singular `event_ticket`. */

export const eventResponse = {
  event: {
    api_id: "evt-1",
    name: "Test Conference",
    start_at: "2030-06-08T11:00:00.000Z",
    end_at: "2030-06-08T17:00:00.000Z",
    created_at: "2030-01-01T00:00:00.000Z",
    timezone: "Etc/UTC",
  },
  hosts: [],
};

export const ticketTypesResponse = {
  ticket_types: [
    { api_id: "tt-paid", name: "General", type: "paid", cents: 5000, currency: "eur", is_hidden: false, max_capacity: 100 },
    { api_id: "tt-free", name: "Community", type: "free", cents: null, currency: null, is_hidden: true, max_capacity: 10 },
  ],
};

/** Paid guest: nested duplicate, list tickets, captured 4000 of 5000 with 1000 discount, coupon on order. */
export const paidGuest = {
  api_id: "gst-paid",
  guest: {
    api_id: "gst-paid",
    user_email: "Paid@Example.com ",
    user_name: "Paula Paid",
    user_first_name: "Paula",
    user_last_name: "Paid",
    approval_status: "approved",
    registered_at: "2030-05-01T10:00:00.000Z",
    checked_in_at: null,
    registration_answers: [
      { label: "Company", question_type: "company", answer_company: "Acme GmbH" },
      { label: "Role", question_type: "job_title", answer_job_title: "CFO" },
    ],
    event_tickets: [
      {
        api_id: "tkt-1",
        name: "General",
        amount: 4000,
        amount_discount: 1000,
        amount_tax: 800,
        currency: "eur",
        is_captured: true,
        event_ticket_type_id: "tt-paid",
      },
    ],
    event_ticket_orders: [
      {
        api_id: "ord-1",
        amount: 4000,
        amount_discount: 1000,
        currency: "eur",
        is_captured: true,
        coupon_info: { api_id: "cpn-1", code: "SAVE20", percent_off: 20 },
      },
    ],
  },
  user_email: "Paid@Example.com ",
  approval_status: "approved",
};

/** Abandoned checkout: amount > 0 but never captured. Must NOT count as paid. */
export const uncapturedGuest = {
  api_id: "gst-uncap",
  email: "uncaptured@example.com",
  name: "Ulrich Uncaptured",
  approval_status: "approved",
  registered_at: "2030-05-02T10:00:00.000Z",
  event_ticket: {
    api_id: "tkt-2",
    name: "General",
    amount: 5000,
    currency: "eur",
    is_captured: false,
    event_ticket_type_id: "tt-paid",
  },
  event_ticket_orders: [
    { api_id: "ord-2", amount: 5000, amount_discount: 500, currency: "eur", is_captured: false, coupon_info: { code: "SAVE20" } },
  ],
};

/** Comped guest: singular free ticket, amount 0, checked in. */
export const freeGuest = {
  api_id: "gst-free",
  email: "free@example.com",
  name: "Frida Free",
  approval_status: "approved",
  registered_at: "2030-05-03T10:00:00.000Z",
  checked_in_at: "2030-06-08T11:05:00.000Z",
  event_ticket: { api_id: "tkt-3", name: "Community", amount: 0, currency: null, is_captured: false, event_ticket_type_id: "tt-free" },
};

/** Pending approval, no tickets at all, no email (falls back to api_id key). */
export const pendingGuest = {
  api_id: "gst-pending",
  name: "Pierre Pending",
  approval_status: "pending_approval",
  registered_at: "2030-05-04T10:00:00.000Z",
};

/** Paid in a second currency with a null-currency captured ticket too. */
export const multiCurrencyGuest = {
  api_id: "gst-multi",
  email: "multi@example.com",
  name: "Marta Multi",
  approval_status: "approved",
  registered_at: "2030-05-05T10:00:00.000Z",
  event_tickets: [
    { api_id: "tkt-4", name: "General", amount: 7000, currency: "usd", is_captured: true, event_ticket_type_id: "tt-paid" },
    { api_id: "tkt-5", name: "General", amount: 100, currency: null, is_captured: true, event_ticket_type_id: "tt-paid" },
  ],
};

export const declinedGuest = {
  api_id: "gst-declined",
  email: "declined@example.com",
  name: "Dora Declined",
  approval_status: "declined",
  registered_at: "2030-05-06T10:00:00.000Z",
  event_ticket: { api_id: "tkt-6", name: "General", amount: 0, currency: "eur", is_captured: false, event_ticket_type_id: "tt-paid" },
};

export const allGuests = [paidGuest, uncapturedGuest, freeGuest, pendingGuest, multiCurrencyGuest, declinedGuest];

export const guestsPage1 = {
  entries: [paidGuest, uncapturedGuest, freeGuest],
  has_more: true,
  next_cursor: "cursor-2",
};

export const guestsPage2 = {
  entries: [pendingGuest, multiCurrencyGuest, declinedGuest],
  has_more: false,
};

export function mkResponse(body: unknown, status = 200): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: status === 200 ? "OK" : "Error",
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}
