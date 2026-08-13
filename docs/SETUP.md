# Setup — Poin't & Polish Booking Website

This guide gets the app running locally and connects it to Supabase, Google Calendar,
Resend email, and Vercel Cron. It reflects **Phase 5 Slice 3**: foundation, auth, RLS,
admin setup, Manila-time availability, public booking, operations, encrypted
per-technician Google Calendar sync, idempotent transactional email, and scheduled
24-hour/2-hour reminders.

## Prerequisites

- **Node.js** 18.18+ (developed on Node 26)
- **npm** 9+
- A **Supabase** project (free tier is fine)
- A Google Cloud project and OAuth web client for calendar connections
- A Resend account and verified sending domain for production email (optional locally)
- A Vercel plan that supports the configured sub-daily Cron schedule

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env.local
```

The app needs the Supabase values below. The service-role key is
required for public booking creation and private reference-photo uploads:

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
5. `supabase/migrations/0005_booking_operation_guards.sql`
6. `supabase/migrations/0006_reminder_candidate_index.sql`
7. `supabase/seed.sql`

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

## 5. Configure Google Calendar

1. In Google Cloud Console, select or create a project and enable the Google Calendar API.
2. Configure the OAuth consent screen. Add the studio staff as test users while the app remains in testing mode.
3. Under APIs & Services > Credentials, create an OAuth client ID with application type Web application.
4. Add these authorized redirect URIs exactly:
   - Local: http://localhost:3000/api/google/callback
   - Production: https://YOUR_DOMAIN/api/google/callback
5. Set the following values in .env.local locally and in the Vercel project environment for deployment:
   - GOOGLE_OAUTH_CLIENT_ID
   - GOOGLE_OAUTH_CLIENT_SECRET
   - GOOGLE_OAUTH_REDIRECT_URL
   - CALENDAR_TOKEN_ENCRYPTION_KEY
6. Generate the encryption key once per environment and keep it stable:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

CALENDAR_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes. Changing it after staff connect invalidates the encrypted token data and requires every technician to reconnect.

Start the app, sign in as each staff member, and open /dashboard/calendar-connections. The consent request uses offline access and only the calendar.events and calendar.readonly scopes. Tokens stay server-side, are encrypted with AES-256-GCM, and never appear in connection-status responses.

Google free/busy reads fail open: if Google is unavailable, the app still computes slots from studio rules, blocks, and confirmed database bookings. Calendar event sync failures do not roll back bookings; owners see a Sync warnings count and can retry from booking details.

## 6. Configure Resend email

Slice 2 sends transactional booking email through the Resend REST API without an SDK.
Create a Resend account, verify a sending domain, and create an API key with sending access.

For production, set both values in Vercel and in any local environment where real
delivery is intentionally enabled:

- `RESEND_API_KEY`: the secret Resend API key. Keep it server-only.
- `EMAIL_FROM`: a sender on the verified domain, for example
  `Poin't & Polish <bookings@your-domain.com>`.

The recipient for `new_booking_admin` comes from **Dashboard > Business settings >
Notification email**. Client messages use the validated email stored on the booking.

When `RESEND_API_KEY` is absent or blank, the app uses a network-free development
logger. It records the recipient and subject locally and writes a development message
ID to `notification_log`; it does not deliver a real email and does not require
`EMAIL_FROM`. This fallback keeps local booking and test flows working without Resend
credentials.

Slice 2 includes seven templates:

- Booking confirmation and new-booking admin notification after booking creation
- Payment verified after the owner verifies a payment
- Studio cancellation and reschedule notices after those owner operations
- 24-hour and 2-hour reminder templates

## 7. Configure Vercel Cron reminders

`vercel.json` invokes `GET /api/cron/reminders` every 30 minutes with this schedule:

```text
*/30 * * * *
```

The interval is timezone-independent; the job converts all reminder window math to
`Asia/Manila`. It processes both the 24-hour window (23-25 hours before the booking)
and the 2-hour window (1.5-2.5 hours before the booking) in one run. The half-hour
schedule requires a Vercel plan that supports sub-daily Cron jobs.

Generate a long secret, set it as `CRON_SECRET` in the Vercel project's **Production**
environment, and redeploy:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Vercel sends that value as `Authorization: Bearer $CRON_SECRET`. The route returns 401
for a missing or incorrect value. Keep `CRON_SECRET` server-only; never expose it as a
`NEXT_PUBLIC_*` variable. Cron jobs run against production deployments, not preview
deployments.

For an intentional local smoke test, start the app and call the route with the same
secret stored in `.env.local`:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
```

Each run returns `{ considered, sent, skipped, failed }`. A successful reminder is
never sent again. Failed reminders and `pending` claims older than 30 minutes may be
retried; one failed send does not stop the rest of the batch. With no `RESEND_API_KEY`,
the existing development logger is used, so local runs make no email network calls.

## 8. Start the app

```bash
npm run dev
```

The Vitest suite includes a real booking-race integration test. It runs only when
`.env.local` points to the exact local URL `http://127.0.0.1:54321`; it skips for
remote Supabase projects so tests never create destructive fixtures remotely.

Run `npx supabase start` before `npm run test` to exercise that integration test.

- Marketing site: <http://localhost:3000>
- Client booking: <http://localhost:3000/book>
- Confirmation: <http://localhost:3000/book/confirmation/PNP-XXXXXX>
- Staff sign in: <http://localhost:3000/login>
- Dashboard (after sign in): <http://localhost:3000/dashboard>
- Services: <http://localhost:3000/dashboard/services>
- Team: <http://localhost:3000/dashboard/team>
- Availability: <http://localhost:3000/dashboard/availability>
- Blocked dates: <http://localhost:3000/dashboard/blocked-dates>
- Business settings / QR: <http://localhost:3000/dashboard/settings>
- Google Calendar: <http://localhost:3000/dashboard/calendar-connections>

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
calendar tokens, profile-role hardening, schedule/booking overlap constraints,
cancelled-slot release, and private reference-photo access.

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and must never reach the browser. It is
  only used by `src/lib/supabase/admin.ts` in trusted server code.
- Google Calendar OAuth tokens are AES-256-GCM encrypted in `calendar_connections`, which has RLS
  enabled and **no policies** — only the service role can read them.
- Public availability reads and booking creation run only in trusted server code.
  The slot API returns computed starts, never raw technician schedules.
- Anonymous clients cannot read or upload `reference-photos`. Validated uploads
  go through the server-only service role; authenticated staff can read the
  private bucket under RLS.
- `promote_to_owner` is executable only by the service role. New Auth users cannot
  promote themselves through signup metadata.
- Never commit `.env.local`. Only `.env.example` is tracked.
- `CRON_SECRET` is read only by the server route and must match the production Vercel
  environment value. `SUPABASE_SERVICE_ROLE_KEY` remains confined to trusted server
  modules used by the reminder runner; neither secret is returned to the browser.
