# Handoff

## Completed

**Phase 2 — Admin Setup** is complete on `feat/phase-2-admin`.

- Repaired the Windows/Docker prerequisite, started the local Supabase stack, and applied
  migrations plus seed data with repeatable `supabase db reset` runs.
- Created one local owner and two local technician Auth users and confirmed the profile
  trigger, trusted owner promotion, and active roles.
- Added owner-only Services management: create, edit, activate/deactivate, reorder, and
  immediate public-site revalidation.
- Added owner-only Team management: create confirmed technician Auth users through the
  server-only service role, edit names/status, and assign services.
- Added owner/technician Availability management: multiple recurring weekly periods and
  date-specific available/unavailable overrides, all scoped in both app code and RLS.
- Added owner/technician Blocked Dates management for full-day and partial-day periods,
  stored as UTC instants converted from `Asia/Manila`.
- Added owner-only Business Settings for studio, booking, payment, policy, Facebook, and
  notification fields.
- Added MariBank QR upload to the public `business-assets` bucket with file validation and
  an undistorted, padded `next/image` preview. No fake QR was uploaded.
- Enabled the Phase 2 owner and technician navigation entries and added shared loading,
  empty, success, error, confirmation, and responsive states.
- Browser-verified public, owner, technician, route-guard, server-action, public
  revalidation, and 390px mobile flows with no Next.js error overlay or horizontal overflow.

## Files changed

- Database: `supabase/migrations/0004_harden_database_access.sql`,
  `supabase/tests/0001_phase2_rls.sql`, regenerated `src/types/database.ts`.
- Services: `src/app/(dashboard)/dashboard/services/*`.
- Team: `src/app/(dashboard)/dashboard/team/*`.
- Availability: `src/app/(dashboard)/dashboard/availability/*`.
- Blocked periods: `src/app/(dashboard)/dashboard/blocked-dates/*`.
- Business settings / QR: `src/app/(dashboard)/dashboard/settings/*`, `next.config.ts`.
- Shared UI: dashboard page header, action notice, submit/confirm controls, select,
  textarea, loading and error boundaries.
- Validation/tests: Phase 2 Zod modules and `src/lib/validation/phase2.test.ts`.
- Navigation/config/docs: `nav-items.ts`, `eslint.config.mjs`, `docs/SETUP.md`, this file.

## Database changes

`0004_harden_database_access.sql`:

- Grants normal PostgREST DML privileges so authenticated requests reach RLS policies.
- Limits anonymous table reads to the public catalog/settings tables.
- Forces every trigger-created profile to start as `technician`; signup metadata cannot
  create an owner.
- Restricts `promote_to_owner(text)` execution to `service_role`.
- Prevents technicians from changing their own email, role, or active status.
- Adds a GiST exclusion constraint preventing overlapping active recurring periods for the
  same technician and weekday.
- Adds one date override per technician/date.
- Adds safe default table privileges for future authenticated/service-role tables; future
  migrations must still enable and define RLS.

Local database state: seed settings + four demo services, one active owner, two active
technicians. `.env.local` contains ignored local-only Supabase values.

## Commands run

- `npx supabase start`
- `npx supabase db reset` (clean migration/seed verification)
- `npx supabase gen types typescript --local`
- `npx supabase test db`
- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run dev` + `agent-browser` owner/technician/mobile verification

## Tests

- Vitest: 26 tests across Auth, Manila time helpers, and Phase 2 validation.
- pgTAP: 19 assertions covering trigger hardening, owner visibility, technician isolation,
  cross-technician write denial, calendar-token denial, owner-promotion ACLs, protected
  profile fields, recurring overlap rejection, and duplicate override rejection.
- Browser: live service creation/public visibility, technician self-service schedule write,
  owner-route rejection for technicians, all Phase 2 route render checks, and mobile overflow.

## Known issues

- A real MariBank QR was not supplied, so upload/preview is implemented but the local
  setting remains empty.
- Local staff credentials are disposable development data and are intentionally not
  documented or committed.
- Client booking, operations, Google Calendar, email, and deployment remain later phases.

## Recommended next task

**Phase 3 — Client Booking.** Build service and technician selection, the tested
`Asia/Manila` availability engine, client details/policy acceptance, private reference-photo
upload, atomic booking creation with final slot recheck, and confirmation/payment instructions.
