# Phase 5 — Integrations (Build Spec)

Phase 5 is built **slice by slice**, in order:

1. **Google Calendar** (this spec's detail) — per-technician OAuth, free/busy reads
   feeding the availability engine, and booking event sync with failure tracking + retry.
2. **Email (Resend)** — 7 transactional messages, idempotent via `notification_log`.
3. **Cron reminders (Vercel Cron)** — 24h + 2h reminder jobs.

> **Testing constraint.** There are no live Google/Resend credentials in this
> environment and nothing is deployed. Every external call sits behind a mockable
> interface; orchestration is unit-tested with fakes; the DB stays authoritative.
> Live OAuth/email/cron verification happens when real credentials are wired and the
> app is deployed. Slices 2–3 are detailed when we reach them.

---

## Slice 1 — Google Calendar

### Confirmed decisions

- **Client:** a thin, hand-written `fetch` client over Google's REST API — no
  `googleapis` dependency.
- **Token storage:** AES-256-GCM encryption at rest, key from a new env var
  `CALENDAR_TOKEN_ENCRYPTION_KEY`. Tokens are unreadable even if the DB is dumped.
- **Free/busy failure mode:** fail open — if the Google busy read fails, ignore it and
  still offer slots from the studio's own rules + DB bookings (logged). DB is
  authoritative; a Google outage never halts booking.

### Scopes & OAuth

- Scopes (smallest that work): `.../auth/calendar.events` (create/update/delete events)
  and `.../auth/calendar.readonly` (free/busy).
- Authorization request uses `access_type=offline` + `prompt=consent` to reliably get a
  refresh token. CSRF-protected `state` (signed nonce + technician id, verified on
  callback). Tokens are never exposed to the browser.

### New environment variable

- `CALENDAR_TOKEN_ENCRYPTION_KEY` — 32-byte key, base64. Add a `serverEnv` getter and a
  `.env.example` entry. `GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URL` already exist.

### Database

- No schema change. `calendar_connections` already has
  `technician_id (unique)`, `calendar_id`, `access_token`, `refresh_token`,
  `token_expires_at`, `scope`; token columns now hold ciphertext strings. RLS stays
  deny-all (service-role only). `bookings.google_event_id` and
  `calendar_sync_status` ('pending'|'synced'|'failed'|'not_connected') already exist.
- Connection status shown in the dashboard is read server-side via the service role and
  returns **only safe fields** (connected boolean, calendar id, connected-at) — never
  tokens.

### Modules (`src/lib/calendar/`)

- `crypto.ts` — `encryptToken` / `decryptToken` (AES-256-GCM; random IV per value;
  store `iv:tag:ciphertext` base64). Key from `CALENDAR_TOKEN_ENCRYPTION_KEY`.
- `client.ts` — `GoogleCalendarClient` **interface** (`exchangeCode`, `refreshAccessToken`,
  `freeBusy`, `createEvent`, `updateEvent`, `deleteEvent`) + a real `fetch`
  implementation (`createGoogleCalendarClient`). Endpoints: `oauth2.googleapis.com/token`,
  `www.googleapis.com/calendar/v3/*`, `freeBusy`. Shared types (`BusyInterval`, `EventInput`).
- `oauth.ts` — `buildAuthUrl(state)`, `signState` / `verifyState` (CSRF).
- `connections.ts` — server-only, via service role: `getConnection`,
  `saveConnection`, `deleteConnection`, `getConnectionStatus` (safe fields), and
  `getValidAccessToken(technicianId)` (decrypts, refreshes if expiring within a margin,
  persists the refreshed token).
- `busy.ts` — `getBusyIntervals(technicianId, { from, to })` → `BusyInterval[]`; returns
  `[]` when not connected or on any error (fail open, logged).
- `sync.ts` — `syncBookingCreated|Rescheduled|Cancelled(bookingId)`: create/update/delete
  the event, then set `google_event_id` + `calendar_sync_status`. **Never throws into the
  booking path**; a failure sets `calendar_sync_status='failed'`.

### Routes & UI

- `GET /api/google/connect` — `requireProfile`; builds the consent URL with a signed
  `state`; redirects to Google.
- `GET /api/google/callback` — verifies `state`, exchanges the code, saves the encrypted
  connection, redirects to `/dashboard/calendar-connections?connected=1`.
- `/dashboard/calendar-connections` — server page showing connection status with
  **Connect** and **Disconnect** (server action → `deleteConnection`, best-effort token
  revoke). Flip the `calendar-connections` nav entry to `available: true` (owner + tech).

### Integration points

- **Availability:** `loadBookingAvailability` (and thus the public slot API) fetches the
  technician's busy intervals for the queried day and passes them to the engine's
  `busyIntervals`. Fail open.
- **Booking lifecycle:** `create.ts` calls `syncBookingCreated` after a successful insert;
  `operations.ts` reschedule/cancel call the matching sync. All best-effort; the DB write
  is authoritative and already committed first.
- **Admin retry:** owner-only `retryCalendarSync(bookingId)` server action + a button on
  the booking details page when `calendar_sync_status='failed'`; the dashboard "Sync
  warnings" stat surfaces the count of failed syncs.

### Testing (Vitest, with a fake `GoogleCalendarClient`)

- `crypto` encrypt→decrypt round-trip; tampered ciphertext rejected.
- `getValidAccessToken` refreshes when expired/expiring and persists the new token.
- `getBusyIntervals` fails open (client throws → `[]`).
- `sync` status transitions: success → `synced`; client throws → `failed`;
  not connected → `not_connected`.
- `oauth` state sign/verify (valid passes, tampered/expired fails).
- No live network calls in tests.

### Out of scope for Slice 1

Email (Slice 2) and Cron reminders (Slice 3). No client-facing UI changes beyond the
technician's own calendar-connection page.

### Definition of done (Slice 1)

- [ ] Technician can connect/disconnect their Google Calendar; tokens stored encrypted,
      never sent to the browser.
- [ ] Availability subtracts Google busy time (fail-open) via the existing engine hook.
- [ ] Booking create/reschedule/cancel sync the calendar event; failures are recorded as
      `calendar_sync_status='failed'` and never break the DB booking.
- [ ] Owner can retry a failed sync; failed-sync count shows on the dashboard.
- [ ] `format` · `lint` · `typecheck` · `test` · `build` and `supabase test db` all pass;
      new Vitest coverage for crypto/refresh/busy/sync/oauth.
- [ ] `.env.example`, `docs/SETUP.md`, and `docs/HANDOFF.md` updated (incl. how to create
      the Google OAuth client and the token key).

---

## Slice 2 — Email (Resend)

Status: **not started** (Slice 1 complete + merged). Follows the same patterns as Slice 1:
external calls behind a mockable interface, orchestration unit-tested with a fake, DB
authoritative, best-effort sends that never break a booking/operation.

### Decisions (defaults — following Slice 1's conventions)

- **Client:** a thin `fetch` client over the Resend REST API (`POST
  https://api.resend.com/emails`) behind an `EmailClient` interface, plus a **fake** for
  tests. No `resend` SDK dependency. When `RESEND_API_KEY` is unset (local dev), fall
  back to a **dev logger** that records the email instead of sending — so the app runs
  and tests pass without a key.
- **Idempotency:** use the existing `notification_log` unique index
  `(booking_id, notification_type)` as the guard. **Insert-first**: attempt to insert a
  `pending` row; a unique-violation means it's already been sent/attempted → skip. On
  success, update the row to `sent` with `provider_message_id`; on failure set `failed`
  (retryable). Never send the same `(booking, type)` twice.
- **Failure mode:** email send is best-effort and post-commit — a failure is logged and
  recorded as `failed` in `notification_log`, and never rolls back or fails the
  triggering booking/operation (same guarantee as calendar sync).

### The 7 messages (PROJECT_BRIEF → Notifications)

Event-triggered in this slice: `booking_confirmation` (client) + `new_booking_admin`
(to `business_settings.notification_email`) on booking creation; `payment_verified`
(client) on owner verify; `cancelled_by_admin` (client) on cancel; `rescheduled_by_admin`
(client) on reschedule. Build the `reminder_24h` + `reminder_2h` **templates** here too,
but their scheduling/trigger is Slice 3 (Vercel Cron) — do not wire a scheduler now.

### Modules (`src/lib/email/`)

- `client.ts` — `EmailClient` interface (`send`), real Resend `fetch` impl, dev-logger
  fallback, and a fake for tests. Uses `serverEnv.resendApiKey` / `serverEnv.emailFrom`.
- `templates.ts` — one function per message returning `{ subject, html, text }`. Branded
  but email-safe (inline CSS, web-safe fonts, burgundy palette; Asia/Manila datetimes via
  the existing Luxon helpers). No external images beyond an optional hosted logo.
- `notify.ts` — `sendBookingEmail(bookingId, type, deps)`: loads booking + recipient,
  runs the insert-first idempotency guard, renders the template, sends, and records the
  result. Never throws into the caller. Owner-only `retryFailedEmail` if useful.

### Integration points

- `create.ts` → send `booking_confirmation` + `new_booking_admin` after the committed
  insert (alongside the existing calendar sync; both best-effort).
- `operations.ts` → `payment_verified` after a successful verify; `cancelled_by_admin`
  after cancel; `rescheduled_by_admin` after reschedule.
- All post-commit and best-effort.

### Testing (Vitest, with the fake `EmailClient`)

- Idempotency: a second `sendBookingEmail(booking, type)` does not send twice
  (unique-violation → skip).
- Failure path: client throws → `notification_log` row `failed`, caller unaffected.
- Each template renders subject/html/text with correct Manila datetimes and no leaked
  internals.
- Dev-logger fallback used when no API key; no live network calls in tests.

### Out of scope for Slice 2

Cron reminder scheduling (Slice 3). No new client-facing pages.

### Definition of done (Slice 2)

- [ ] All 7 templates built; the 5 event-triggered emails send on their events.
- [ ] Idempotent via `notification_log`; no duplicate `(booking, type)` sends.
- [ ] Send failures are recorded and never break the booking/operation.
- [ ] Runs and tests pass with no `RESEND_API_KEY` (dev-logger fallback).
- [ ] `format` · `lint` · `typecheck` · `test` · `build` and `supabase test db` pass;
      new Vitest coverage for idempotency, failure, and each template.
- [ ] `.env.example`, `docs/SETUP.md`, `docs/HANDOFF.md` updated (Resend setup + `EMAIL_FROM`).
