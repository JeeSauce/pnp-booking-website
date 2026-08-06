# CLAUDE.md

## Project

You are building the **Poin't & Polish Booking Website**.

Read `PROJECT_BRIEF.md` completely before editing code. Treat it as the product source of truth.

## Primary Objective

Deliver a simple, production-ready MVP for one nail studio using:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- Google Calendar
- Resend
- Vercel

The booking experience must be mobile-first. The dashboard must work on mobile and desktop.

## Non-Negotiable Product Rules

1. A standard appointment occupies **120 minutes**.
2. Clients select a specific nail technician.
3. Every technician has separate availability.
4. Clients cannot cancel or reschedule online.
5. Only the Owner/Admin can cancel or reschedule.
6. New bookings are automatically confirmed.
7. Payment is manual through a MariBank QR image.
8. New bookings begin with payment status `unverified`.
9. Payment proof is sent manually through the configured Facebook account.
10. There is only one location.
11. The system timezone is `Asia/Manila`.
12. The database is the source of truth.
13. Google Calendar is used for busy-time checking and event synchronization.
14. Double-booking protection must be enforced server-side and at the database level.

## Working Style

- Keep the implementation simple.
- Do not introduce features outside the MVP.
- Prefer clear code over clever abstractions.
- Use small, understandable components.
- Avoid unnecessary dependencies.
- Keep business logic out of React presentation components.
- Use server-side actions, route handlers, or Supabase RPCs for sensitive writes.
- Validate all external input with Zod.
- Never expose service-role credentials or OAuth tokens to the client.
- Use strict TypeScript.
- Do not use `any` unless unavoidable and documented.
- Add comments only when the reasoning is not obvious.

## Before Coding

1. Inspect the repository.
2. Read `PROJECT_BRIEF.md` and `AGENTS.md`.
3. Identify the current phase.
4. Write a short implementation plan.
5. Confirm the existing data model before creating duplicate tables or routes.
6. Reuse existing components when appropriate.

Do not ask the user questions for placeholder business details. Use editable demo data and clearly mark it for replacement.

## Architecture

Use feature-oriented organization where practical:

```text
src/
  app/
    (public)/
    (dashboard)/
    api/
  components/
    booking/
    dashboard/
    shared/
    ui/
  lib/
    auth/
    availability/
    bookings/
    calendar/
    email/
    supabase/
    validation/
  types/
supabase/
  migrations/
  seed.sql
```

The exact structure may adapt to the repository, but maintain separation between:

- UI
- validation
- availability calculation
- booking transaction logic
- Google Calendar integration
- email delivery
- database access

## Availability Logic

Create one tested availability engine.

It must account for:

- Technician weekly schedule
- Multiple work periods per day
- Date overrides
- Blocked periods
- Existing active bookings
- Google Calendar busy events
- Service duration
- Optional buffer
- Minimum notice
- Booking window
- Slot interval
- Asia/Manila timezone

A slot is valid only when the entire appointment fits without overlap.

Do not duplicate this logic across client and dashboard pages.

## Booking Creation

Never trust a slot merely because it was displayed as available.

The final booking write must:

1. Run on the server.
2. Revalidate all input.
3. Recheck availability.
4. Lock or otherwise protect against concurrent creation.
5. Insert the booking atomically.
6. Return a clear conflict when the slot was just taken.
7. Trigger calendar and email work safely after the database booking succeeds.

Use a PostgreSQL exclusion constraint or an equivalently robust overlap safeguard.

## Authentication and Authorization

Use Supabase Auth.

Roles:

- `owner`
- `technician`

Enforce access with both:

- Application-level checks
- Supabase Row Level Security

Never rely on hidden buttons as authorization.

Technicians may manage their own availability and assigned appointments only. They may mark their own appointments completed or no-show. They cannot cancel, reschedule, verify payment, or manage other users.

## Google Calendar

- Use OAuth per technician.
- Request the smallest scopes needed.
- Read free/busy data.
- Create, update, and cancel events.
- Save the Google event ID on the booking.
- Keep tokens server-only.
- Handle token refresh.
- A Google failure must not erase a valid database booking.
- Record sync failure and provide an admin retry action.

## MariBank QR

- Store the QR image in Supabase Storage.
- Display it in a themed card.
- Do not recolor, crop, stretch, cover, or distort the QR modules.
- Preserve enough whitespace around the QR.
- Keep the account name and Facebook payment-proof link editable.

## Email

Use Resend.

Required messages:

- Booking confirmation
- New booking notification
- 24-hour reminder
- 2-hour reminder
- Payment verified
- Cancelled by admin
- Rescheduled by admin

Use idempotency through `notification_log` or an equivalent table.

## UI Quality

- Mobile-first
- Accessible labels
- Keyboard navigation
- Clear focus states
- Useful error messages
- Loading, empty, success, and failure states
- No cramped forms
- No horizontal scrolling
- Confirmation before destructive admin actions
- Booking flow should feel simple and calm

Do not copy YouCanBookMe's appearance.

## Testing Priorities

At minimum, test:

- Availability across working hours and breaks
- Two-hour slot boundaries
- Date overrides
- Blocked periods
- Existing bookings
- Google busy periods
- Minimum notice
- Booking-window limits
- Asia/Manila date handling
- Concurrent booking attempts
- RLS role restrictions
- Admin cancellation
- Admin rescheduling
- Reminder deduplication

## Completion Standard

Before declaring a phase complete:

1. Run formatting.
2. Run linting.
3. Run type checking.
4. Run tests.
5. Build the app.
6. Fix errors rather than suppressing them.
7. Update setup documentation.
8. Summarize what changed and what remains.

## Do Not Add

- Online payment gateway
- GCash integration
- Automatic receipt verification
- SMS
- Client accounts
- Multi-location support
- Loyalty features
- Inventory
- Payroll
- Commission tracking
- Complex reporting

Stay focused on the booking MVP.
