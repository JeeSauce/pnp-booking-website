# Phase 3 — Client Booking (Kickoff Spec)

> Audience: the agent (Codex) picking up Phase 3. Read `PROJECT_BRIEF.md`,
> `CLAUDE.md`, `AGENTS.md`, and `docs/HANDOFF.md` first. This file narrows those
> into a concrete, ordered task list so you don't re-derive scope.

## Goal

Let a client book an appointment end to end: pick a service, pick a specific
technician, pick a genuinely-available two-hour slot, enter their details, accept the
no-cancellation policy, and receive confirmation with MariBank QR payment
instructions. The booking is created **atomically and safely** — no double-booking,
ever. This is the heart of the product.

## Current state (what Phases 1–2 gave you)

- Full schema + RLS + hardening (`supabase/migrations/0001..0004`), including the
  **DB-level double-booking guard**: `bookings_no_overlap` GiST exclusion constraint on
  `(technician_id, tstzrange(starts_at, ends_at)) where status <> 'cancelled_by_admin'`.
- Admin can now create real data: services, technicians (+ `technician_services`),
  availability rules/overrides, blocked periods, business settings, MariBank QR.
- **Time helpers already built and tested**: `src/lib/availability/time.ts`
  (`nowInManila`, `toManila`, `manilaDateTime`, `addMinutes`, `intervalsOverlap`,
  `fitsWithin`, weekday helpers, `toUtcIso`). Build the engine on top of these — do not
  reinvent timezone math.
- Supabase clients incl. **service role** (`src/lib/supabase/admin.ts`) for the trusted
  atomic booking write (anon has no INSERT policy on `bookings` by design).
- Public site + brand UI kit; `formatPeso` and demo fallback in `src/lib/demo.ts`;
  live services already read via `src/lib/data/services.ts`.
- Settings that drive availability live in `business_settings`:
  `minimum_notice_minutes`, `booking_window_weeks`, `slot_interval_minutes`,
  `default_buffer_minutes`.
- Local Supabase stack is used for dev; `npx supabase test db` runs pgTAP.

## Deliverable 1 (do this first): the availability engine

CLAUDE.md requires **one tested availability engine**, not logic duplicated across
pages. Put it in `src/lib/availability/` (e.g. `engine.ts`) as a pure function:

```
computeAvailableSlots(input): Slot[]
```

It must account for, all in `Asia/Manila`:

- Technician **weekly schedule** (`availability_rules`, multiple periods per weekday)
- **Date overrides** (`availability_overrides`: unavailable day, or custom window)
- **Blocked periods** (`blocked_periods`, partial and multi-day)
- **Existing active bookings** (status in confirmed/completed/no_show — cancelled frees time)
- **Service duration** (`duration_snapshot`/service `duration_minutes`, default 120)
- **Optional buffer** (`default_buffer_minutes`)
- **Minimum notice** (`minimum_notice_minutes` from "now")
- **Booking window** (`booking_window_weeks`)
- **Slot interval** (`slot_interval_minutes`, default 30)
- **Google Calendar busy events** — Phase 5. Design the engine to accept an optional
  injected `busyIntervals: {start,end}[]` (default `[]`) so Phase 5 plugs in without a
  refactor. Do NOT call Google here.

Rules: a slot is valid only when the **entire** appointment fits inside a working
window and overlaps none of the above. Never emit past times or times outside the
window. Keep it pure (inputs in, slots out) so it's unit-testable and reusable by both
the public API and any future dashboard view.

**Tests are mandatory** (Vitest) — cover PROJECT_BRIEF "Testing Priorities":
working hours + breaks, 2-hour slot boundaries, date overrides, blocked periods,
existing bookings, minimum notice, booking-window limits, and Asia/Manila date
handling (incl. day boundaries around UTC+8).

## Deliverable 2: the public booking flow

Replace the `/book` placeholder with a calm, mobile-first, multi-step flow
(PROJECT_BRIEF "Booking flow"):

1. **Service** — active services (name, price, 120 min).
2. **Technician** — only technicians assigned to that service (`technician_services`),
   active only.
3. **Date & slot** — call a server endpoint that runs the engine for the chosen
   technician/service/date; show only valid two-hour starts. Never expose another
   technician's raw schedule to the client (compute server-side; return slots only).
4. **Client details** — full name, mobile, email (required); notes and an optional
   nail **reference photo** (private).
5. **Policy** — must accept the no-cancellation policy before confirming
   (store `policy_accepted_at`). No client cancel/reschedule anywhere.
6. **Review & confirm** — summary, then confirm.
7. **Confirmation + payment** — see Deliverable 4.

Use Zod for every step's input; keep step state on the client but **re-validate and
recompute server-side** at submit. Reuse the UI kit; add clear selected states, large
tap targets, and loading/empty/error states.

## Deliverable 3: atomic booking creation (safety-critical)

Create the booking through a **server action or route handler** (not the browser).
PROJECT_BRIEF "Booking Creation" + "Double-Booking Protection":

1. Re-validate all input (Zod).
2. **Recheck availability server-side** using the same engine — never trust the slot
   just because it was displayed.
3. Snapshot `price_snapshot` and `duration_snapshot` from the service at write time.
4. Insert atomically with the **service-role** client (anon can't insert by RLS).
   Set `status='confirmed'`, `payment_status='unverified'`, `policy_accepted_at`,
   `calendar_sync_status='not_connected'` (Google is Phase 5).
5. Rely on the `bookings_no_overlap` exclusion constraint as the final race guard:
   catch Postgres **`exclusion_violation` (SQLSTATE 23P01)** and return a clean
   "slot was just taken" conflict that sends the client back to slot selection.
6. Reference photo: upload to the **private `reference-photos` bucket** via a server
   action using the service role (there is no anon storage policy, by design), then
   store its path on the booking. Validate type/size; never make it public.

> Prefer keeping the tested TS engine as the single source of truth for the recheck,
> with the DB constraint as the concurrency backstop. A `SECURITY DEFINER` RPC is an
> acceptable alternative for the insert, but don't duplicate the availability logic in
> SQL — the engine stays in TS.

Emails (confirmation, new-booking admin) are **Phase 5**. You may write a
`notification_log` row as `pending`, but do not send.

## Deliverable 4: confirmation & payment page

PROJECT_BRIEF "Payment Process → Client experience". After booking, show a themed
confirmation (e.g. `/book/confirmation/[booking_code]`) that:

- Confirms the appointment (service, technician, date/time in Asia/Manila, booking code).
- Shows the **MariBank QR** from `business-assets` — **undistorted, correct aspect
  ratio, quiet zone preserved, scannable**. Never crop/recolor/stretch.
- Shows the account name and the required amount.
- Has a button to the configured **Facebook** page; instruct the client to send the
  payment receipt via Messenger.
- States clearly: appointment is **reserved**, payment is **awaiting verification**.
- No cancellation/reschedule controls.

## Conventions (from CLAUDE.md — follow exactly)

- Sensitive writes via server actions/route handlers, validated with **Zod**. Never
  trust client input; always recheck availability server-side.
- Availability logic lives in **one** engine module; do not duplicate it in pages.
- Never expose the service-role key or another technician's raw schedule to the client.
- Strict TypeScript, no `any` unless documented. Reuse the existing UI kit and brand
  system; mobile-first, accessible, with loading/empty/success/error states.
- All appointment math in `Asia/Manila`; standard appointment = 120 minutes.
- Any schema change → timestamped `000N_*` migration, then regenerate
  `src/types/database.ts`. Cancelled bookings must not block time.

## Testing (AGENTS.md — "Any change touching bookings must include overlap tests")

- Engine unit tests (see Deliverable 1).
- **Concurrent booking attempts**: two overlapping requests → exactly one succeeds, the
  other gets a conflict (exercise the exclusion constraint). Add a pgTAP and/or
  integration test under `supabase/tests/` or the Vitest suite.
- Booking creation rechecks and rejects a stale/taken slot.
- Reference photo stays private (staff-only) — extend the pgTAP storage checks.
- Keep all existing tests green (Vitest 26 + pgTAP 19).

## Definition of done (Phase 3)

- [ ] Tested availability engine; only genuinely available 2-hour slots are shown.
- [ ] Full booking flow: service → technician → slot → details → policy → confirm.
- [ ] Optional reference photo uploads privately and is linked to the booking.
- [ ] Booking creation is server-side, re-validated, re-checked, and atomic.
- [ ] Two clients cannot reserve overlapping times (constraint + graceful conflict UX).
- [ ] New bookings are `confirmed` / `unverified`; `policy_accepted_at` recorded.
- [ ] Confirmation page shows an undistorted, scannable MariBank QR + Facebook proof CTA
      + "reserved, payment unverified".
- [ ] Clients cannot cancel or reschedule anywhere.
- [ ] `npm run format` · `lint` · `typecheck` · `test` · `build` and `supabase test db`
      all pass.
- [ ] `docs/HANDOFF.md` updated (Completed / Files / DB changes / Tests / Next task).

## Branch & handoff

- Branch from `master`: `feat/phase-3-booking` (or per-slice: `feat/availability-engine`,
  `feat/booking-flow`, `fix/double-booking` per AGENTS.md).
- Timestamped/sequential migrations only; never weaken RLS. Keep the app runnable after
  each task; focused, reversible commits.
- Out of scope (Phase 4+): dashboard calendar, booking list/details, payment
  verification, admin cancel/reschedule, completion/no-show, Google Calendar, Resend
  emails, Vercel Cron. Also everything in PROJECT_BRIEF "MVP Exclusions".
