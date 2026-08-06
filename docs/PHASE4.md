# Phase 4 — Operations (Kickoff Spec)

> Audience: the agent (Codex) picking up Phase 4. Read `PROJECT_BRIEF.md`,
> `CLAUDE.md`, `AGENTS.md`, and `docs/HANDOFF.md` first. This file narrows those
> into a concrete, ordered task list so you don't re-derive scope.

## Goal

Give staff the tools to run the studio day to day: see bookings on a calendar and in a
list, open a booking's details, verify payments, and manage bookings. Enforce the role
split exactly: **owner** can do everything; **technicians** see only their own
appointments and may only mark them completed or no-show. No client-facing changes.

## Current state (what Phases 1–3 gave you)

- Bookings are created atomically by the public flow, `confirmed` / `unverified`, with
  the `bookings_no_overlap` GiST exclusion constraint as the double-booking guard.
- **Tested availability engine**: `src/lib/availability/engine.ts` +
  `src/lib/bookings/availability.ts` (`loadBookingAvailability`) and
  `src/lib/bookings/create.ts`. Reuse this exact recheck path for **rescheduling**.
- Booking data access + validation patterns: `src/lib/data/booking.ts`,
  `src/lib/validation/booking.ts`, service-role client `src/lib/supabase/admin.ts`.
- Auth/session guards: `src/lib/auth/session.ts` (`requireProfile`, `requireRole('owner')`,
  `isOwner`). Dashboard shell + nav gating in `src/components/dashboard/*`
  (`nav-items.ts` — flip Calendar / Bookings / Payments to `available: true` as they ship).
- RLS today: owner full access to `bookings`; technician **read-only** on their assigned
  bookings; no technician write policy (by design — see below). Reference photos are in
  the private `reference-photos` bucket (staff read).
- Tests to keep green: Vitest 38, pgTAP 26. Local Supabase stack + `supabase test db`.

## Scope

**In scope** (PROJECT_BRIEF "Dashboard Pages" + "Build Order → Phase 4"):

1. **Dashboard calendar** — bookings for a day/week. Owner sees all technicians;
   technician sees only their own. Read-only calendar; clicking a booking opens details.
2. **Bookings list** — filter by status/payment/date/technician (owner) or own
   (technician); paginated or sensible default range. Links to details.
3. **Booking details** — full booking info, client contact, notes, and the private
   reference photo via a **short-lived signed URL** (never a public URL). Shows status,
   payment status, and the actions permitted for the viewer's role.
4. **Payment verification** (owner only) — set `payment_status` `unverified → verified`
   (and support `waived`). Record who/when if you add columns for it.
5. **Admin cancellation** (owner only) — set `status='cancelled_by_admin'`; cancelled
   bookings free the slot (the constraint already excludes them). An email is Phase 5 —
   you may write a `pending` `notification_log` row but do not send.
6. **Admin rescheduling** (owner only) — move a booking to a new technician/time.
   **Reuse the Phase 3 engine recheck** and rely on the exclusion constraint; return a
   clean conflict if the new slot is taken. Update `starts_at`/`ends_at` atomically.
7. **Completion / no-show** — technician (for their own) and owner may set
   `status` `completed` or `no_show`. Only from an appropriate current state.

**Out of scope** (Phase 5+): Google Calendar sync, Resend emails, Vercel Cron
reminders, and anything in PROJECT_BRIEF "MVP Exclusions". Phase 4 writes only the
database + `notification_log` rows; it sends nothing.

## The permission model (do this carefully — it's the core of the phase)

Phase 1 deliberately gave technicians **no write policy** on `bookings` so they could
not cancel, reschedule, or verify payment through PostgREST. Preserve that guarantee.
Implement technician completion/no-show and all owner mutations through **trusted
server actions** that:

- Guard with `requireRole('owner')` (owner actions) or `requireProfile()` + an explicit
  `technician_id === auth.uid()` check (technician actions), **and**
- Perform the write with the **service role** (`admin.ts`) after enforcing the allowed
  state transition in code — OR add narrowly-scoped `SECURITY DEFINER` RPCs / a new
  `0005_*` migration if you prefer DB-enforced transitions.

Whichever you choose, the end state must hold under direct PostgREST calls too:

- Technicians **cannot** cancel, reschedule, verify payment, or touch another
  technician's booking. Add pgTAP coverage proving each denial.
- Owners can do all booking mutations.
- Allowed transitions only, e.g. `confirmed → completed | no_show | cancelled_by_admin`;
  payment `unverified → verified | waived`. Reject nonsensical transitions.

If you add columns (e.g. `payment_verified_at`, `payment_verified_by`, `cancelled_at`,
`cancellation_reason`), do it in a timestamped `0005_*` migration and regenerate
`src/types/database.ts`.

## Conventions (from CLAUDE.md — follow exactly)

- All mutations via validated (Zod) server actions; never trust the client. Enforce
  authorization in **both** app code and RLS/DB.
- Reuse the ONE availability engine for reschedule rechecks — do not duplicate slot
  logic. Cancelled bookings must not block time.
- Never expose the service-role key or another technician's data to the client. Private
  reference photos are shown only via short-lived signed URLs to authorized staff.
- All times in `Asia/Manila`; standard appointment = 120 minutes. Strict TypeScript,
  no `any` unless documented. Reuse the UI kit/brand system; mobile + desktop
  responsive; loading/empty/success/error states; **confirm before destructive actions**
  (cancellation especially).

## Testing (AGENTS.md — "Any change touching bookings must include overlap tests")

- pgTAP: technician cannot cancel / reschedule / verify payment / edit another
  technician's booking; owner can; allowed-transition enforcement; reschedule respects
  the overlap constraint.
- Vitest/integration: reschedule into a taken slot returns a conflict; payment
  verification flips status; completion/no-show permitted only from valid states;
  cancelled booking frees its slot (a new booking can take it).
- Keep Vitest 38 + pgTAP 26 green and extend both.

## Definition of done (Phase 4)

- [ ] Owner: calendar (all), bookings list, details, payment verify, cancel, reschedule,
      completion/no-show — all working and guarded.
- [ ] Technician: calendar/list/details for **their own** bookings; completion/no-show
      only; cannot cancel, reschedule, or verify payment (proven by tests).
- [ ] Rescheduling reuses the engine recheck and cannot create an overlap.
- [ ] Reference photos shown to staff via short-lived signed URLs only.
- [ ] Confirm-before-destructive on cancellation; clear success/error feedback.
- [ ] Corresponding `nav-items.ts` entries flipped to `available: true`.
- [ ] `npm run format` · `lint` · `typecheck` · `test` · `build` and `supabase test db`
      all pass.
- [ ] `docs/HANDOFF.md` updated (Completed / Files / DB changes / Tests / Next task).

## Branch & handoff

- Branch from `master`: `feat/phase-4-operations` (or per-slice: `feat/booking-management`,
  `fix/reschedule-overlap`).
- Timestamped/sequential migrations only (`0005_*`); never weaken RLS. Keep the app
  runnable after each task; focused, reversible commits.
