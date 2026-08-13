# Handoff

## Completed

**Phase 5 Slice 2 - Email (Resend)** is complete on feat/phase-5-email.

- Added a typed EmailClient, thin Resend REST fetch implementation, test fake, and network-free development logger used when RESEND_API_KEY is unset.
- Added seven branded, email-safe templates with inline CSS, web-safe fonts, escaped values, and Asia/Manila appointment formatting.
- Added service-role booking/recipient loading plus insert-first notification_log idempotency. Successful sends record sent_at/provider_message_id and failures record failed.
- Wired the five event-triggered messages after their committed database operations; failures never throw into or roll back the caller.
- Built reminder_24h and reminder_2h templates only. No Cron route, scheduler, or client-facing page was added.

## Files changed

- Email integration: src/lib/email/client.ts, templates.ts, and notify.ts.
- Booking lifecycle wiring: src/lib/bookings/create.ts and operations.ts.
- Tests: src/lib/email/client.test.ts, templates.test.ts, notify.test.ts, plus the existing booking create/operations integration tests.
- Environment/test configuration: src/lib/env.ts, .env.example, and vitest.config.mts.
- No client-facing pages or routes changed.
- Documentation: docs/SETUP.md and docs/HANDOFF.md.

## Database changes

- No migration or generated type change.
- Reused notification_log, the notification_type enum, and the unique (booking_id, notification_type) index from 0001_initial_schema.sql.
- notification_log remains RLS-enabled; writes continue through the trusted service-role client.

## Commands run

- npx supabase start
- npx supabase db reset
- npm run format
- npm run lint
- npm run typecheck
- npm run test
- npm run build
- npx supabase test db
- npx vitest run src/lib/email
- npx vitest run src/lib/email src/lib/bookings/create.integration.test.ts src/lib/bookings/operations.integration.test.ts

## Tests

- Vitest: 67 passing tests total. Slice 2 covers all seven templates, Manila datetime rendering, escaping, unsafe URL rejection, the no-key development fallback, Resend request shape, idempotency, contained failures, recipient routing, and all five local-Supabase lifecycle triggers.
- pgTAP: 40 passing assertions across the existing Phase 2-4 RLS, booking overlap, operation guard, and storage suites.
- Production build: passed with no RESEND_API_KEY configured and no new routes.
- Live Resend delivery was not exercised because this environment has no real Resend credentials or verified sender domain; production setup is documented.

## Known issues

- Google Calendar live consent and event behavior still require verification after real credentials and the production redirect URI are configured.
- Real Resend delivery still requires RESEND_API_KEY plus an EMAIL_FROM address on a verified domain.
- Payment verification remains manual through Facebook Messenger.
- Vercel Cron reminder scheduling is intentionally not implemented in this slice.

## Recommended next task

**Phase 5 Slice 3 - Cron reminders.** Add Vercel Cron processing for the existing reminder_24h and reminder_2h templates with idempotent notification_log claims.
