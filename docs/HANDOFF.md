# Handoff

## Completed

**Phase 4 — Operations** is complete on `feat/phase-4-operations`.

- Added role-scoped day/week dashboard calendars and filterable booking lists. Owners see all technicians; technicians see only their own RLS-authorized bookings.
- Added booking details with client contact, notes, status/payment state, and private reference photos exposed only through two-minute signed URLs after booking authorization.
- Added trusted, Zod-validated server actions for owner payment verification/waiver, cancellation, and rescheduling, plus owner/assigned-technician completion and no-show.
- Rescheduling reuses `loadBookingAvailability`, excludes only the booking being moved, rechecks the selected slot server-side, and maps exclusion SQLSTATE `23P01` to a clean conflict.
- Added an owner payment queue and live, role-scoped overview counts. Calendar, Bookings, and owner Payments navigation entries are now available.
- No Google Calendar or email calls are made. Cancellation immediately releases the slot through the existing exclusion predicate.

## Files changed

- Operations routes/UI: `src/app/(dashboard)/dashboard/calendar`, `bookings`, `payments`, and the dashboard overview.
- Trusted operations: `src/lib/bookings/operations.ts`, `availability.ts`, `src/lib/validation/operations.ts`, and the protected reschedule availability route.
- Authorized reads/presentation: `src/lib/data/operations.ts`, booking formatting/status/list components, and the reschedule form.
- Navigation: `src/components/dashboard/nav-items.ts`.
- Tests: `src/lib/bookings/operations.integration.test.ts`, `supabase/tests/0002_phase3_booking.sql`, and `0003_phase4_operations.sql`.

## Database changes

- Added `supabase/migrations/0005_booking_operation_guards.sql`.
- A `BEFORE UPDATE` trigger enforces terminal booking/payment transitions, immutable booking snapshots, confirmed-only rescheduling, and duration-consistent end times for every write path.
- Preserved owner-wide booking RLS and technician read-only booking RLS; no technician booking write policy was added.
- Narrowed private reference-photo reads so owners may read all attached booking photos while technicians may read only photos attached to their own bookings.
- No columns or generated client-visible schema types changed, so `src/types/database.ts` remains current.

## Commands run

- `npx supabase start`
- `npx supabase db reset`
- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npx supabase test db`
- Local owner/technician browser verification with desktop/mobile layouts and accessibility checks.

## Tests

- Vitest: 43 passing tests, including payment verification, allowed/terminal outcome transitions, reschedule conflict, duration-snapshot preservation, and cancelled-slot reuse through the public creation path.
- pgTAP: 40 passing assertions. Phase 4 proves technicians cannot cancel, reschedule, verify payment, or edit another technician's booking; owners can perform valid mutations; invalid reversals fail; overlaps remain rejected; and reference photos follow booking ownership.
- Browser verification: owner calendar/list/details/payments render seeded bookings; reschedule returns computed slots; signed photo URLs contain a short-lived token; technician details expose only completion/no-show; owner-only payments redirect technicians; mobile list has no horizontal overflow; no runtime overlay or browser errors were detected.

## Known issues

- Payment verification remains manual and receipt delivery stays in Facebook Messenger.
- Google Calendar sync, Resend notifications, and reminder jobs remain intentionally unimplemented for Phase 5.
- The dashboard still reports sync warnings as unavailable until Phase 5 provides calendar connection health.

## Recommended next task

**Phase 5 — Integrations.** Add Google Calendar OAuth/busy reads and retryable post-booking sync, then Resend confirmation/admin/cancellation/reschedule emails and idempotent reminder jobs. Keep database bookings authoritative and feed Google busy intervals into the existing engine injection point.