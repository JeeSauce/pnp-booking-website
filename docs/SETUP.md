# Setup — Poin't & Polish Booking Website

This guide gets the app running locally and connects it to Supabase. It reflects
**Phase 2**: foundation, auth, RLS, services, team management, availability,
blocked periods, business settings, and MariBank QR upload.

## Prerequisites

- **Node.js** 18.18+ (developed on Node 26)
- **npm** 9+
- A **Supabase** project (free tier is fine)
- Optional for later phases: Google Cloud OAuth client, Resend account, Vercel

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env.local
```

For Phase 2 you only need the Supabase values (the rest are for later phases):

| Variable                         | Where to find it                                  |
| -------------------------------- | ------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | Supabase → Project Settings → API → Project URL   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Supabase → Project Settings → API → anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY`      | Supabase → Project Settings → API → service_role key (**server only**) |
| `NEXT_PUBLIC_APP_URL`            | `http://localhost:3000` in development            |

> The app runs **without** Supabase configured — the marketing site shows editable
> demo services and the dashboard simply redirects to the sign-in screen. Add the
> Supabase values to enable authentication and live data.

## 3. Apply the database schema

The migrations live in `supabase/migrations/` and seed data in `supabase/seed.sql`.

### Option A — Supabase CLI (recommended)

```bash
# One-time: link to your project (needs your project ref + db password)
npx supabase link --project-ref <your-project-ref>

# Push all migrations to the linked project
npx supabase db push

# Load demo business settings + services
#   (db push does not run seed.sql; paste it in the SQL editor, or use a local reset)
```

For a full local stack with automatic seeding:

```bash
npx supabase start      # local Postgres + Studio (Docker)
npx supabase db reset   # runs migrations, then seed.sql
```

### Option B — SQL editor (no CLI)

In the Supabase dashboard → **SQL Editor**, run these files in order:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_rls_policies.sql`
3. `supabase/migrations/0003_storage.sql`
4. `supabase/migrations/0004_harden_database_access.sql`
5. `supabase/seed.sql`

## 4. Create staff accounts

Staff sign in with Supabase Auth. A matching row in `public.profiles` is created
automatically by a database trigger (default role: `technician`).

1. Supabase → **Authentication → Users → Add user** (email + password).
   Set user metadata `{"full_name": "Owner Name"}` if desired. New profiles always
   start as technicians; client-controlled metadata is never trusted for roles.
2. Promote your first account to owner from trusted setup SQL:

   ```sql
   update public.profiles set role = 'owner' where email = 'you@studio.com';
   -- or, while using the trusted service role:
   select public.promote_to_owner('you@studio.com');
   ```

3. Sign in as the owner and create further technician accounts from
   `/dashboard/team`. The service-role key stays server-side.

## 5. Run the app

```bash
npm run dev
```

- Marketing site: <http://localhost:3000>
- Staff sign in: <http://localhost:3000/login>
- Dashboard (after sign in): <http://localhost:3000/dashboard>
- Services: <http://localhost:3000/dashboard/services>
- Team: <http://localhost:3000/dashboard/team>
- Availability: <http://localhost:3000/dashboard/availability>
- Blocked dates: <http://localhost:3000/dashboard/blocked-dates>
- Business settings / QR: <http://localhost:3000/dashboard/settings>

## Available scripts

| Script                | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| `npm run dev`         | Start the dev server                               |
| `npm run build`       | Production build                                   |
| `npm run start`       | Serve the production build                         |
| `npm run lint`        | ESLint                                             |
| `npm run typecheck`   | Generate route types, then `tsc --noEmit`          |
| `npm run test`        | Run the Vitest suite                               |
| `npm run format`      | Format with Prettier                               |
| `npm run format:check`| Verify formatting                                  |

## Regenerating database types

After linking a Supabase project, replace the hand-authored types:

```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

Keep this file in sync whenever you add a migration.

For the local stack:

```bash
npx supabase gen types typescript --local > src/types/database.ts
```

## Database authorization tests

With the local stack running:

```bash
npx supabase test db
```

The pgTAP suite verifies owner-wide visibility, technician isolation, protected
calendar tokens, profile-role hardening, and schedule-integrity constraints.

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and must never reach the browser. It is
  only used by `src/lib/supabase/admin.ts` in trusted server code.
- Google Calendar OAuth tokens live in `calendar_connections`, which has RLS
  enabled and **no policies** — only the service role can read them.
- `promote_to_owner` is executable only by the service role. New Auth users cannot
  promote themselves through signup metadata.
- Never commit `.env.local`. Only `.env.example` is tracked.
