# Handoff

## Completed

**Phase 5 Slice 1 - Google Calendar** is complete on feat/phase-5-google-calendar.

- Added a thin typed Google Calendar REST client and fake with OAuth exchange/refresh, free/busy, event create/update/delete, and best-effort revocation.
- Added AES-256-GCM encryption for access and refresh tokens using CALENDAR_TOKEN_ENCRYPTION_KEY, plus signed, expiring OAuth state tied to the authenticated staff profile.
- Added service-role-only connection storage, safe connection status, refresh-on-expiry persistence, authenticated connect/callback routes, and confirmed disconnect handling.
- Added the responsive dashboard calendar-connection page and enabled it for owner and technician navigation.
- Fed Google busy intervals into the existing availability engine for public and reschedule slot reads. Google read failures log a warning and fail open.
- Synced booking create, reschedule, technician reassignment, and cancellation only after the database write succeeds. Failures remain visible in calendar_sync_status without rolling back bookings.
- Added owner-only retry from booking details and a role-scoped Sync warnings count on the dashboard.
- Kept Email/Resend and Cron reminder slices out of scope.

## Files changed

- Calendar integration: src/lib/calendar/crypto.ts, client.ts, oauth.ts, connections.ts, busy.ts, sync.ts.
- OAuth and connection UI: src/app/api/google/connect, src/app/api/google/callback, and src/app/(dashboard)/dashboard/calendar-connections.
- Booking integration: src/lib/bookings/availability.ts, create.ts, operations.ts, and booking/dashboard data/actions/pages.
- Navigation and environment: src/components/dashboard/nav-items.ts, src/lib/env.ts, .env.example, and vitest.config.mts.
- Tests: src/lib/calendar/crypto.test.ts, oauth.test.ts, connections.test.ts, and sync.test.ts.
- Documentation: docs/SETUP.md and docs/HANDOFF.md.

## Database changes

- No migration or generated type change.
- Reused calendar_connections and bookings.google_event_id/calendar_sync_status from 0001_initial_schema.sql.
- calendar_connections remains RLS-enabled with no client policies; only the service role can read or write encrypted tokens.

## Commands run

- npx supabase start
- npx supabase db reset
- npm run format
- npm run lint
- npm run typecheck
- npm run test
- npm run build
- npx supabase test db
- npx vitest run src/lib/calendar

## Tests

- Vitest: 53 passing tests total. The 10 calendar tests cover encryption round-trip/tamper rejection, OAuth state validity/tamper/expiry, safe connection status, refresh persistence, fail-open busy reads, and synced/failed/not-connected transitions with no live Google calls.
- pgTAP: 40 passing assertions across the existing Phase 2-4 RLS, booking overlap, operation guard, and storage suites.
- Production build: passed with the connect, callback, and calendar-connections routes included.
- Live Google OAuth was not exercised because this environment has no real Google credentials or deployed callback URL; setup steps are documented for deployment verification.

## Known issues

- Google Calendar live consent and event behavior still require verification after real credentials and the production redirect URI are configured.
- Payment verification remains manual through Facebook Messenger.
- Resend email and Vercel Cron reminders are intentionally not implemented in this slice.

## Recommended next task

**Phase 5 Slice 2 - Email.** Add the seven Resend transactional messages with idempotent notification_log writes. Keep Cron reminders for Slice 3.
