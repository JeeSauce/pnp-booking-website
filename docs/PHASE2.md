# Phase 2 — Admin Setup (Kickoff Spec)

> Audience: the agent (Codex) picking up Phase 2. Read `PROJECT_BRIEF.md`,
> `CLAUDE.md`, `AGENTS.md`, and `docs/HANDOFF.md` first. This file narrows those
> into a concrete, ordered task list so you don't re-derive scope.

## Goal

Give the **owner** full control of the studio's setup data, and let **technicians**
manage their own schedule. This unblocks real availability data that the Phase 3
booking flow depends on. UI-heavy, built on the Phase 1 foundation — most tables and
RLS already exist.

## Current state (what Phase 1 gave you)

- Schema, enums, indexes, triggers, and the double-booking exclusion constraint:
  `supabase/migrations/0001_initial_schema.sql`
- RLS for every table (owner full; technician own data + read own bookings):
  `supabase/migrations/0002_rls_policies.sql`
- Storage buckets `reference-photos` (private) and `business-assets` (public):
  `supabase/migrations/0003_storage.sql`
- Seed: one `business_settings` row + 4 demo services (`supabase/seed.sql`)
- App plumbing to reuse — **do not rebuild these**:
  - Supabase clients: `src/lib/supabase/{server,client,admin}.ts`
  - Auth guards: `src/lib/auth/session.ts` → `requireProfile()`, `requireRole('owner')`, `isOwner()`
  - Sign-out + login patterns: `src/lib/auth/actions.ts`, `src/app/(auth)/login/*`
  - Validation pattern: Zod schemas in `src/lib/validation/` (see `auth.ts`)
  - UI kit: `src/components/ui/{button,input,label,card}.tsx`; brand pieces in
    `src/components/shared/*`; dashboard shell + nav in `src/components/dashboard/*`
  - Types: `src/types/database.ts` (hand-authored — **regenerate** after any migration)
  - Constants + time helpers: `src/lib/constants.ts`, `src/lib/availability/time.ts`
  - Nav gating: `src/components/dashboard/nav-items.ts` — flip each item's
    `available: false → true` as its page ships.

## Prerequisite: stand up the database (do this first)

Phase 1 was **never applied to a live database** (no project was provisioned). Before
building UI, get a working DB and verify the existing RLS:

1. `npx supabase start` then `npx supabase db reset` (local), **or** link a hosted
   project and apply migrations + `seed.sql` per `docs/SETUP.md`.
2. Create an **owner** and at least two **technician** auth users; confirm the
   `handle_new_user` trigger created matching `profiles` rows.
3. Verify RLS with both roles (owner sees all; technician sees only their own
   availability/blocks and only their assigned bookings; `calendar_connections` is
   unreadable by clients). Capture these as tests where practical.

If anything in Phase 1's RLS is wrong, fix it in a **new** `0004_*` migration — do not
edit shipped migrations.

## Scope

**In scope** (PROJECT_BRIEF "Build Order → Phase 2" + "Dashboard Pages"):

1. **Services** (owner) — list, create, edit, activate/deactivate, reorder; fields:
   name, description, preparation_instructions, duration_minutes (default 120), price,
   active, sort_order.
2. **Team members** (owner) — list technicians, create/invite (Supabase Auth admin via
   service role in a server action — never expose the service key), set active/inactive,
   edit name. Assign which services each technician offers (`technician_services`).
3. **Availability** — recurring weekly hours (`availability_rules`, multiple periods
   per weekday) and date overrides (`availability_overrides`). Owner manages any
   technician; technician manages their own.
4. **Blocked dates / periods** (`blocked_periods`) — full-day and partial-day blocks.
   Owner any technician; technician their own. Set `created_by`.
5. **Business settings** (owner) — edit all `business_settings` fields, including
   min notice, booking window, slot interval, buffer, cancellation policy, Facebook
   URL, MariBank account name, payment note.
6. **MariBank QR upload** (owner) — upload image to the `business-assets` bucket, store
   its path in `business_settings.maribank_qr_path`. Preserve the QR: never crop,
   recolor, stretch, or distort; keep the quiet zone. Show a themed preview.

**Out of scope** (later phases): the client booking flow (P3); dashboard calendar,
booking list, payment verification, cancel/reschedule (P4); Google Calendar, Resend,
cron (P5). Also everything in `PROJECT_BRIEF.md` → "MVP Exclusions".

## Recommended build order

Do **Services** and **Team** first — together they produce the technician list and
service assignments the Phase 3 booking flow needs.

1. Services CRUD → 2. Team + `technician_services` → 3. Availability (rules + overrides)
→ 4. Blocked periods → 5. Business settings → 6. MariBank QR upload.

## Conventions (from CLAUDE.md — follow exactly)

- Sensitive writes go through **server actions / route handlers**, validated with
  **Zod** at the boundary. Never trust client input.
- Enforce authorization in **both** places: app-level guards (`requireRole`/`isOwner`)
  **and** RLS. Never rely on hidden UI as authorization.
- Owner-only pages: guard the route segment with `requireRole('owner')`. Technician
  self-service pages: `requireProfile()` + scope every query to `auth.uid()`.
- Keep business logic out of presentation components. Small, understandable components.
- Strict TypeScript; no `any` unless documented. Reuse the existing UI kit and brand
  system (Cormorant/Montserrat, burgundy palette) — do not restyle.
- Mobile-first, accessible: labeled inputs, keyboard nav, visible focus, and loading /
  empty / success / error states. Confirm before destructive actions.
- After any schema change: add a timestamped `000N_*` migration, then regenerate
  `src/types/database.ts` (`supabase gen types typescript --linked`).

## Testing (AGENTS.md "Testing Priorities")

- RLS role restrictions: owner vs technician for each table touched.
- Zod validation for each new form/action (valid + invalid cases).
- Availability data integrity: overlapping/invalid rule windows rejected; override
  time-window rule; `Asia/Manila` handling for dates.
- Keep the Vitest suite green and add coverage for new server actions where feasible.

## Definition of done (Phase 2)

- [ ] Database applied and seeded; RLS verified with owner + technician sessions.
- [ ] Owner can create/edit services and toggle active; changes appear on the public
      site (it already reads live services via `src/lib/data/services.ts`).
- [ ] Owner can add technicians, set active, and assign services.
- [ ] Each technician can define recurring weekly hours (multiple periods) and overrides.
- [ ] Owner and technicians can add full-day and partial-day blocks.
- [ ] Owner can edit all business settings, including booking window / notice / interval.
- [ ] Owner can upload the MariBank QR (scannable, undistorted) and it's stored + shown.
- [ ] Corresponding `nav-items.ts` entries flipped to `available: true`.
- [ ] `npm run format` · `lint` · `typecheck` · `test` · `build` all pass.
- [ ] `docs/HANDOFF.md` updated (Completed / Files / DB changes / Tests / Next task).

## Branch & handoff

- Branch from `master`: `feat/phase-2-admin` (or per-feature `feat/services`,
  `feat/team`, … per AGENTS.md).
- Timestamped/sequential migrations only; never weaken RLS to simplify dev.
- Keep the app runnable after each completed task; open focused, reversible commits.
