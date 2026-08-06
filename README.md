# Poin't & Polish — Booking Website

A simple, mobile-first booking website for the **Poin't & Polish** nail studio.
Clients choose a service, a specific technician, and an available two-hour
appointment; the owner and team manage schedules and bookings from a responsive
dashboard. Payment is manual via a MariBank QR code with proof sent through
Facebook Messenger.

> **Status: Phase 1 (Foundation) complete.** Project, database schema, auth, roles,
> RLS, seed data, and the responsive shell are in place. Booking flow, dashboard
> operations, Google Calendar, and email arrive in later phases.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript** (strict)
- **Tailwind CSS v4** + shadcn/ui-style components
- **Supabase** — Postgres, Auth, Storage, Row Level Security
- **Luxon** for `Asia/Manila` time handling · **Zod** for validation
- **Vitest** for tests · deploys to **Vercel**
- Later phases: Google Calendar API, Resend, Vercel Cron

## Quick start

```bash
npm install
cp .env.example .env.local   # add your Supabase keys
npm run dev
```

Open <http://localhost:3000>. The site runs even before Supabase is configured —
it shows editable demo services and routes the dashboard to sign-in.

Full setup (database migrations, seed, creating staff) is in **[docs/SETUP.md](docs/SETUP.md)**.

## Product rules (non-negotiable)

- Appointments are **120 minutes**; clients pick a specific technician.
- Each technician has independent availability. All time math uses **Asia/Manila**.
- New bookings are auto-**confirmed** with payment status **unverified**.
- Clients **cannot** cancel or reschedule online — only the owner/admin can.
- Double-booking is prevented **server-side and at the database level**
  (Postgres exclusion constraint).
- The database is the source of truth; Google Calendar is a synchronized mirror.

## Project structure

```text
src/
  app/
    (public)/      # marketing site, policies, booking entry
    (auth)/        # staff sign in
    (dashboard)/   # owner & technician dashboard (auth-guarded)
  components/
    ui/            # shadcn-style primitives
    shared/        # wordmark, fleuron, header, footer
    dashboard/     # dashboard shell + nav
  lib/
    supabase/      # browser, server, admin clients + proxy session
    auth/          # session + role helpers
    availability/  # Asia/Manila time engine (tested)
    validation/    # Zod schemas
    data/          # server-side data access
  types/           # database types
  proxy.ts         # Next 16 proxy (session refresh + route guard)
supabase/
  migrations/      # schema, RLS, storage
  seed.sql         # demo business settings + services
docs/              # SETUP.md, HANDOFF.md
```

## Documentation

- **[docs/SETUP.md](docs/SETUP.md)** — local + Supabase setup, scripts, security notes
- **[docs/HANDOFF.md](docs/HANDOFF.md)** — what shipped, files, DB changes, next task
- **[PROJECT_BRIEF.md](PROJECT_BRIEF.md)** — the product source of truth
- **[CLAUDE.md](CLAUDE.md)** / **[AGENTS.md](AGENTS.md)** — engineering conventions

## Demo content

Business name, services, prices, address, Facebook link, and QR are **editable demo
values** clearly marked for replacement in the dashboard (Phase 2). Nothing here is a
real business detail.
