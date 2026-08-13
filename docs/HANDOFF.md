# Handoff

## Completed

**Phase 5 Slice 3 - Vercel Cron reminders** is complete on feat/phase-5-cron.

- Added pure Asia/Manila due selection for the 23-25 hour and 1.5-2.5 hour reminder windows, excluding non-confirmed bookings and reminder types already marked sent.
- Added a bounded service-role reminder batch that sends through the Slice 2 sender and reports considered, sent, skipped, and failed counts without aborting after one send failure.
- Extended notification claims with opt-in reminder retries for failed rows and pending rows older than 30 minutes. Event-triggered Slice 2 emails keep their original no-retry behavior; sent rows always block.
- Added a CRON_SECRET-protected GET /api/cron/reminders route and one Vercel Cron entry scheduled every 30 minutes.
- No client-facing page or brand-system change was added.

## Files changed

- Reminder integration: src/lib/reminders/due.ts and run.ts.
- Cron route/schedule: src/app/api/cron/reminders/route.ts and vercel.json.
- Retry-aware sender: src/lib/email/notify.ts.
- Tests: due.test.ts, run.test.ts, route.test.ts, and the extended email notify.test.ts.
- Database: supabase/migrations/0006_reminder_candidate_index.sql.
- Environment/test configuration: .env.example and vitest.config.mts.
- Documentation: docs/SETUP.md and docs/HANDOFF.md.

## Database changes

- Added 0006_reminder_candidate_index.sql with bookings_status_starts_idx on (status, starts_at), matching the bounded confirmed-booking Cron query.
- Regenerated src/types/database.ts against the reset local schema; the index adds no type-level change, so the checked-in type contract remains unchanged.
- Reused notification_log and its unique (booking_id, notification_type) guard. RLS was not weakened; reminder reads/writes use the trusted service role only.

## Commands run

- npx supabase start
- npx supabase db reset
- npx supabase gen types typescript --local
- npm run format
- npm run lint
- npm run typecheck
- npm run test
- npm run build
- npx supabase test db
- npx vitest run src/lib/email/notify.test.ts src/lib/reminders src/app/api/cron/reminders/route.test.ts

## Tests

- Vitest: 79 passing tests total. Slice 3 covers both due windows, outside-window/status/sent exclusions, failed and stale-pending retry, sent deduplication, unchanged event-email behavior, batch isolation/summary counts, bounded query range, and route authorization.
- pgTAP: 40 passing assertions across the existing Phase 2-4 RLS, booking overlap, operation guard, and storage suites.
- Production build: passed and includes the dynamic /api/cron/reminders route.
- All reminder tests use injected time and a fake EmailClient; no live Resend or deployed Cron call was used.

## Known issues

- Google Calendar live consent and event behavior still require verification after real credentials and the production redirect URI are configured.
- Real Resend delivery still requires RESEND_API_KEY plus an EMAIL_FROM address on a verified domain.
- Vercel Cron execution still requires CRON_SECRET in the Production environment, a production deployment, and a plan supporting the 30-minute schedule.
- Payment verification remains manual through Facebook Messenger.

## Recommended next task

**Phase 6 - Quality & deployment.** Complete accessibility/mobile/error-state hardening, production configuration, Vercel deployment, and live integration smoke tests.
