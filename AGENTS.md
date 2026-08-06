# AGENTS.md

## Purpose

This repository may be worked on by Claude and Codex. Coordinate through the repository, not through assumptions.

Read these files before beginning:

1. `PROJECT_BRIEF.md`
2. `CLAUDE.md`
3. This file
4. Existing migrations and project documentation

## Shared Rules

- Do not overwrite another agent's work without reviewing it.
- Inspect `git status` and recent changes before editing.
- Keep changes scoped to one clear task.
- Do not mix unrelated refactors with feature work.
- Do not change product rules without documenting the reason.
- Never commit secrets.
- Prefer migrations over manual database changes.
- Keep the app runnable after each completed task.
- Update documentation when setup or behavior changes.
- Do not add speculative features.

## Suggested Agent Responsibilities

### Claude

Best used for:

- Product interpretation
- UI and flow implementation
- Dashboard screens
- Forms and validation
- Availability experience
- Documentation
- Integration orchestration
- Refactoring for clarity

### Codex

Best used for:

- Database migrations
- Supabase RLS policies
- Transactional booking logic
- Overlap constraints
- API and server logic
- Tests
- Security review
- Debugging
- Build and type-check fixes

This is a suggested division, not a hard restriction. Either agent may work on any task after inspecting the current repository.

## Handoff Format

At the end of a work session, add or update a concise handoff note in `docs/HANDOFF.md`:

```md
# Handoff

## Completed
- ...

## Files changed
- ...

## Database changes
- ...

## Commands run
- ...

## Tests
- ...

## Known issues
- ...

## Recommended next task
- ...
```

Do not use the handoff file as a replacement for clean commits and readable code.

## Branch and Commit Discipline

Recommended branch naming:

- `feat/booking-flow`
- `feat/availability`
- `feat/google-calendar`
- `fix/double-booking`
- `chore/supabase-setup`

Recommended commit style:

- `feat: add technician availability rules`
- `fix: prevent overlapping bookings`
- `chore: add Supabase seed data`
- `test: cover two-hour slot generation`

Keep commits focused and reversible.

## Source of Truth

Priority order:

1. `PROJECT_BRIEF.md`
2. Database migrations
3. Existing working behavior
4. `CLAUDE.md`
5. `docs/HANDOFF.md`

When documents conflict, stop changing code and reconcile the conflict in documentation first.

## Database Coordination

Before creating a migration:

1. Review all existing migrations.
2. Check whether the table, column, enum, index, or policy already exists.
3. Use a new timestamped migration.
4. Make it safe for the expected environment.
5. Add or update seed data separately when possible.
6. Test RLS with both owner and technician roles.

Never weaken RLS to make development easier.

## Booking Safety

All agents must preserve these rules:

- Standard booking duration is 120 minutes.
- A slot must fit fully within technician availability.
- Busy Google Calendar periods block availability.
- Existing confirmed bookings block availability.
- Cancelled bookings do not block availability.
- Final booking creation must recheck the slot.
- Concurrent requests must not create overlapping appointments.
- Clients cannot cancel or reschedule.
- Only Owner/Admin can cancel or reschedule.

Any change touching bookings must include or update tests for overlap behavior.

## Google Calendar Safety

- The database booking is authoritative.
- Calendar sync happens after the booking is safely stored.
- Calendar failure must be visible and retryable.
- OAuth credentials and refresh tokens stay server-side.
- Do not log tokens.
- Do not return tokens to browser code.

## Payment Safety

This project does not process payments.

- Show the uploaded MariBank QR.
- Do not claim payment is verified automatically.
- Keep new bookings as `unverified`.
- Admin manually changes them to `verified`.
- Preserve QR scannability.

## Required Checks Before Handoff

Run the available equivalents of:

```bash
npm run format
npm run lint
npm run typecheck
npm run test
npm run build
```

If a command does not exist, either add a sensible script or document why it was not run.

## Review Checklist

Before merging significant work:

- Does it follow the project brief?
- Does it work in Asia/Manila?
- Does it protect against double booking?
- Are server writes validated?
- Are role permissions enforced by RLS?
- Are mobile layouts usable?
- Are failures visible and recoverable?
- Are secrets protected?
- Are tests updated?
- Is the handoff note current?

## Initial Recommended Task Sequence

1. Bootstrap Next.js and Supabase.
2. Add schema, enums, indexes, and RLS.
3. Add owner and technician authentication.
4. Build services and team management.
5. Build recurring availability and blocked periods.
6. Build and test the availability engine.
7. Build the public booking flow.
8. Add atomic booking creation.
9. Add dashboard calendar and booking management.
10. Add MariBank QR payment instructions.
11. Add Google Calendar OAuth and synchronization.
12. Add Resend notifications and reminders.
13. Deploy and verify on Vercel.
