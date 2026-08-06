# Handoff

## Completed

**Phase 3 — Client Booking** is complete on `feat/phase-3-booking`.

- Added one pure `Asia/Manila` availability engine built on the existing time helpers. It handles multiple weekly periods, date overrides, manual blocks, active bookings, injected future Google busy intervals, service duration, buffer, minimum notice, booking window, and slot interval.
- Replaced `/book` with a mobile-first flow for service, assigned active technician, server-computed date/time, required client details, optional private reference photo, no-cancellation acceptance, review, and confirmation.
- Added a no-store slot API that validates IDs/date and returns computed slots only. Raw technician schedules never leave trusted server code.
- Added trusted booking creation that revalidates all fields, reloads service/technician/settings, rechecks the same engine, snapshots price/duration, uploads an optional photo privately, inserts through the service role, and maps SQLSTATE `23P01` to a clean slot-conflict response.
- New bookings are `confirmed` / `unverified`, record `policy_accepted_at`, and use `calendar_sync_status='not_connected'`. No email or Google call is made in Phase 3.
- Added `/book/confirmation/[booking_code]` with appointment details, reserved/payment-awaiting-verification messaging, account/amount, Facebook Messenger receipt CTA, and an unoptimized `object-contain` MariBank QR with preserved padding/quiet zone.
- Kept all client cancellation/reschedule controls out of the public experience.

## Files changed

- Availability: `src/lib/availability/engine.ts`, `engine.test.ts`.
- Booking server boundary: `src/lib/bookings/*`, `src/lib/data/booking.ts`, `src/lib/validation/booking.ts`, `/api/availability`, `/book/actions.ts`.
- Public UI: `src/components/booking/booking-flow.tsx`, `/book` loading/error/page files, confirmation route.
- Tests: `src/lib/bookings/create.integration.test.ts`, `src/test/server-only.ts`, `vitest.config.mts`, `supabase/tests/0002_phase3_booking.sql`.
- Documentation: `docs/SETUP.md`, this file.

## Database changes

- No schema change was required; the existing bookings fields, strict RLS, private `reference-photos` bucket, and `bookings_no_overlap` GiST exclusion constraint already satisfy Phase 3.
- No `0005_*` migration was added and `src/types/database.ts` did not need regeneration.
- Added pgTAP coverage only; production database structure is unchanged.

## Commands run

- `npx supabase start`
- `npx supabase db reset`
- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npx supabase test db`

## Tests

- Vitest: 38 passing tests across Auth/validation, Manila time helpers, the availability engine, and local service-role booking integration.
- Availability coverage includes work periods/breaks, exact two-hour boundaries, overrides, blocks, active vs cancelled bookings, injected busy periods, minimum notice, booking-window limits, buffer, and UTC-to-Manila day boundaries.
- Integration coverage proves a stale displayed slot is rejected and two simultaneous overlapping requests produce exactly one success and one conflict.
- pgTAP: 26 passing assertions across Phase 2 RLS/hardening plus active-booking exclusion, cancelled-slot release, and private reference-photo read/upload policies.
- Production Next.js build passes; `/book`, `/api/availability`, and confirmation are dynamic server routes as required.

## Known issues

- A real MariBank QR was not supplied, so the confirmation page shows a clear contact fallback until the owner uploads one in Business Settings.
- Google Calendar busy reads/sync and Resend notifications remain Phase 5; the engine already accepts injected busy intervals and bookings remain authoritative.
- Phase 4 operations screens (booking calendar/list/details, payment verification, admin cancellation/rescheduling, completion/no-show) are not part of this phase.

## Recommended next task

**Phase 4 — Operations.** Build the owner/team booking calendar, booking list/details, manual payment verification, owner-only cancellation/rescheduling, and technician completion/no-show actions. Preserve the Phase 3 engine/recheck path for rescheduling and add overlap/permission tests for every booking mutation.
