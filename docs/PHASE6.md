# Phase 6 — Quality & Deployment (Go-Live Runbook)

Phases 1–5 are complete on `master`. This is the final phase: take the app live on a
hosted Supabase + Vercel, wire the real Google/Resend/Cron credentials, and verify the
whole thing end to end. Work top to bottom.

> Detailed provider steps already live in [docs/SETUP.md](SETUP.md) (§5 Google, §6
> Resend, §7 Cron). This file is the ordered checklist that ties them together.

## 0. Pre-deploy sanity (local)

- [ ] On `master`, clean tree: `git status`.
- [ ] All green locally (Docker running for the DB suites):
      `npm run format:check` · `npm run lint` · `npm run typecheck` · `npm run test` ·
      `npm run build` · `npx supabase test db`.
- [ ] (Optional hardening) swap the cron route's bearer-secret `!==` for a constant-time
      compare. Ask me to do this — it's a one-file change.

## 1. Hosted Supabase project

- [ ] Create a project at supabase.com. Note the **Project URL**, **anon key**, and
      **service_role key**.
- [ ] Apply the schema. Easiest: `npx supabase link --project-ref <ref>` then
      `npx supabase db push` (pushes migrations `0001`–`0006`). Or paste each migration
      then `seed.sql` in the SQL editor, in order (see SETUP.md §3).
- [ ] Confirm `seed.sql` ran (1 `business_settings` row + 4 demo services).
- [ ] Create the **owner** auth user (Authentication → Add user), then promote:
      `select public.promote_to_owner('you@studio.com');`
- [ ] Create the Storage buckets if not created by migration `0003` (they should be):
      `reference-photos` (private) and `business-assets` (public).

## 2. Google OAuth (Calendar)

- [ ] Google Cloud: enable the Calendar API; configure the OAuth consent screen; add
      studio staff as test users (while in "testing").
- [ ] Create an OAuth **Web** client. Authorized redirect URIs:
      `http://localhost:3000/api/google/callback` **and**
      `https://YOUR_DOMAIN/api/google/callback`.
- [ ] Keep the Client ID/Secret for the env step.

## 3. Resend (email)

- [ ] Create a Resend account, **verify a sending domain**, create an API key.
- [ ] Decide the `EMAIL_FROM` sender on that verified domain.
      (Without a key, prod would silently use the dev-logger and not deliver — so a real
      key is required to actually send.)

## 4. Deploy to Vercel

- [ ] Import the GitHub repo (`JeeSauce/pnp-booking-website`) into Vercel. Framework:
      Next.js (auto-detected). No build config needed.
- [ ] Set **all** environment variables (Production) — see the table below.
- [ ] Deploy. Note the production domain.
- [ ] Set `NEXT_PUBLIC_APP_URL` and `GOOGLE_OAUTH_REDIRECT_URL` to the **real domain**,
      and make sure that same callback URL is in the Google client (step 2). Redeploy if
      you changed them after the first deploy.
- [ ] Confirm the Cron job registered (Vercel → Project → Cron). The `*/30 * * * *`
      schedule needs a plan that allows sub-daily crons.

### Environment variables (all required for full functionality)

| Variable | Purpose | Public? |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Prod base URL (no trailing slash) | client |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key | client |
| `SUPABASE_SERVICE_ROLE_KEY` | Trusted server writes (bypasses RLS) | **server** |
| `GOOGLE_OAUTH_CLIENT_ID` | Calendar OAuth | server |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Calendar OAuth | **server** |
| `GOOGLE_OAUTH_REDIRECT_URL` | `https://YOUR_DOMAIN/api/google/callback` | server |
| `CALENDAR_TOKEN_ENCRYPTION_KEY` | 32-byte base64; encrypts calendar tokens | **server** |
| `RESEND_API_KEY` | Email sending | **server** |
| `EMAIL_FROM` | Verified sender address | server |
| `CRON_SECRET` | Authorizes the reminder cron route | **server** |

Generate the two secrets once and keep them stable:
`node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"` (key)
and `...toString('hex')` (cron secret). Rotating `CALENDAR_TOKEN_ENCRYPTION_KEY` after
staff connect forces every technician to reconnect.

## 5. Live end-to-end verification (on the deployed URL)

- [ ] **Public booking:** landing → `/book` → pick service/technician/slot → details →
      accept policy → confirm → confirmation page shows the MariBank QR (undistorted) and
      the Facebook "send receipt" CTA; booking is `confirmed` / `unverified`.
- [ ] **Confirmation email** actually arrives (check inbox + Resend dashboard logs).
- [ ] **Admin notification email** arrives at `business_settings.notification_email`.
- [ ] **Owner:** sign in → dashboard shows the booking; verify payment → status flips and
      a "payment verified" email sends; try cancel and reschedule.
- [ ] **Technician:** sign in as a technician → sees only their own bookings; can mark
      completed / no-show; cannot cancel/verify.
- [ ] **Google Calendar:** connect a technician's calendar (real OAuth round-trip) →
      confirm a busy event on their Google calendar blocks that slot in `/book`, and a new
      booking creates an event on their calendar. Break/disconnect and confirm fail-open.
- [ ] **Cron:** `curl -H "Authorization: Bearer $CRON_SECRET"
      https://YOUR_DOMAIN/api/cron/reminders` → 200 + JSON summary; wrong/no secret → 401.
      Create a booking ~2h out and confirm the reminder email fires on the next run.
- [ ] **Mobile:** walk the booking flow on a phone — no horizontal scroll, tappable
      targets, readable.
- [ ] **Double-booking:** two overlapping attempts → exactly one succeeds (this is
      already proven by tests, but sanity-check once live).

## 6. Definition of Done (from PROJECT_BRIEF.md)

- [ ] Admin can create services + technicians; each technician has separate availability.
- [ ] Only genuinely available 2-hour slots show; two clients can't overlap.
- [ ] Bookings auto-confirm; QR page correct; client told to send proof via Facebook.
- [ ] Admin can verify payment; admin can cancel/reschedule; clients cannot.
- [ ] Google busy times block availability; confirmed bookings create calendar events.
- [ ] Confirmation + reminder emails work.
- [ ] Team members only access their own data. Site works on mobile. Deployed on Vercel.
- [ ] Setup docs current (SETUP.md, this runbook).

## 7. What I can help with here

- The `timingSafeEqual` cron hardening (pre-deploy).
- A code-level accessibility / error-state / mobile polish pass.
- **Driving the live verification in §5 with you** once the URL exists (I can browse the
  deployed site, check network/console, and confirm each item).
- Fixing anything that surfaces during go-live.

## Notes

- Vercel MCP + Supabase MCP connectors exist but need interactive OAuth to authorize;
  once connected they'd let me inspect deployments/logs directly. Not required — the
  checklist works without them.
