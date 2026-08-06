# Handoff

## Completed

**Phase 1 — Foundation** is complete and verified.

- Next.js 16 (App Router, Turbopack) + TypeScript (strict) + Tailwind CSS v4 project,
  scaffolded into the existing repo without disturbing the brief/brand assets.
- Brand design system from `P&P Brand Guidelines`: palette (Deep Burgundy, Wine Red,
  Ivory, Dusty Blush, Soft Taupe) and fonts (Cormorant Garamond display + Montserrat
  body) wired as Tailwind theme tokens in `src/app/globals.css`. Signature "diamond
  fleuron" divider component.
- shadcn/ui-compatible primitives (`button`, `input`, `label`, `card`) + `cn` util +
  `components.json`.
- Supabase wiring: browser, server (SSR cookies), and service-role clients; session
  refresh + protected-route guard via Next 16 **Proxy** (`src/proxy.ts`).
- Full database schema, RLS, and storage as SQL migrations + seed (see below).
- Supabase Auth: staff login (server action + validated form), sign-out, role-aware
  session helpers (`requireProfile` / `requireRole`).
- Responsive public site: landing (hero, how-it-works, services from DB with demo
  fallback, policy strip), booking-policy, privacy, and a `/book` placeholder (full
  flow is Phase 3). Sticky header + footer.
- Responsive dashboard shell with role-based navigation (owner vs technician),
  mobile drawer, and an overview page showing build progress.
- Timezone foundation for the availability engine (Luxon, `Asia/Manila`) with tests.
- `.env.example`, `docs/SETUP.md`, this handoff, and README.

## Files changed

- Config: `package.json`, `next.config.ts`, `tsconfig.json` (scaffold), `components.json`,
  `.prettierrc.json`, `.prettierignore`, `vitest.config.mts`, `.gitignore`, `.env.example`,
  `.claude/launch.json`.
- App: `src/app/layout.tsx`, `globals.css`, `not-found.tsx`,
  `(public)/{layout,page}.tsx`, `(public)/book/page.tsx`,
  `(public)/booking-policy/page.tsx`, `(public)/privacy/page.tsx`,
  `(auth)/{layout}.tsx`, `(auth)/login/{page,login-form,actions}.tsx`,
  `(dashboard)/dashboard/{layout,page}.tsx`.
- Components: `ui/{button,input,label,card}.tsx`,
  `shared/{wordmark,fleuron,site-header,site-footer,legal-page}.tsx`,
  `dashboard/{dashboard-shell,nav-items}.ts(x)`.
- Lib: `utils.ts`, `constants.ts`, `env.ts`, `demo.ts`,
  `supabase/{client,server,admin,middleware}.ts`, `auth/{session,actions}.ts`,
  `availability/time.ts` (+ test), `validation/auth.ts` (+ test), `data/services.ts`.
- Types: `src/types/database.ts` (hand-authored, mirrors migrations).
- Assets: brand logo + guidelines copied to `public/brand/`.
- `src/proxy.ts`.

## Database changes

New migrations under `supabase/migrations/`:

- `0001_initial_schema.sql` — extensions (`pgcrypto`, `btree_gist`); enums
  (`user_role`, `booking_status`, `payment_status`, `calendar_sync_status`,
  `notification_type`); tables `profiles`, `business_settings`, `services`,
  `technician_services`, `availability_rules`, `availability_overrides`,
  `blocked_periods`, `bookings`, `calendar_connections`, `notification_log`;
  indexes; `updated_at` triggers; `handle_new_user` trigger (auto-profile);
  helpers `current_user_role()`, `is_owner()`, `gen_booking_code()`.
  **Double-booking is enforced at the DB level** via a `btree_gist` exclusion
  constraint on `(technician_id, tstzrange(starts_at, ends_at))` for all
  non-cancelled bookings.
- `0002_rls_policies.sql` — RLS enabled on every table. Owner has full access;
  technicians can read/write only their own availability/blocks and read only their
  assigned bookings. `services`/`business_settings`/`technician_services` are
  publicly readable for the booking site. `calendar_connections` has RLS enabled and
  **no policies** (service-role only) so OAuth tokens never reach a client.
- `0003_storage.sql` — `reference-photos` (private, staff-only) and `business-assets`
  (public read, owner write) buckets + object policies.

Seed: `supabase/seed.sql` — one `business_settings` row + 4 demo services (all
120 min), idempotent; plus `promote_to_owner(email)` helper.

## Commands run

- `npm run format` / `format:check` → all files match Prettier style
- `npm run lint` → 0 problems
- `npm run typecheck` → passes (`next typegen` + `tsc --noEmit`)
- `npm run test` → 16 passed (2 files)
- `npm run build` → succeeds; routes `/`, `/book`, `/booking-policy`, `/privacy`
  static, `/login` dynamic, `/dashboard` guarded, Proxy registered
- Manual: dev server smoke-tested — landing, `/login`, and `/dashboard`→`/login`
  redirect all render with no console or server errors

## Tests

`src/lib/availability/time.test.ts` — Asia/Manila parsing, date-key boundaries,
120-minute end calc, weekday conversion, interval overlap/containment (2h slot
boundaries). `src/lib/validation/auth.test.ts` — login schema.

## Known issues / notes

- **No live Supabase project was provisioned** (requires interactive auth). Migrations
  and seed are written and ready to apply per `docs/SETUP.md`; they have not been run
  against a live database yet. Verify RLS with owner + technician sessions after applying.
- `src/types/database.ts` is hand-authored to match the migrations. Regenerate with
  `supabase gen types` once linked.
- Technician write access to `bookings` (completed/no-show) is intentionally **not**
  granted via RLS; it will go through a validated server RPC in Phase 4 so technicians
  cannot cancel/reschedule/verify-payment.
- Client reference-photo upload will use server-issued signed URLs in Phase 3 (no anon
  storage policy exists yet, by design).
- `business_settings.notification_email` is currently publicly readable along with the
  rest of that row; move it to an owner-only surface if it should stay private.

## Recommended next task

**Phase 2 — Admin setup.** Build owner-only management for services, team members,
availability rules/overrides, blocked periods, business settings, and MariBank QR
upload (Supabase Storage `business-assets`). This unblocks real availability data for
the Phase 3 booking flow. Start with Services + Team (they seed the technician list
the booking flow needs), then Availability, then Settings/QR.
