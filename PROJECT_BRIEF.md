# Poin't & Polish Booking Website — Build Brief

## Goal

Build a simple, polished booking website for **Poin't & Polish** where:

- Clients can choose a service, a specific nail technician, and an available two-hour appointment.
- The owner and team can manage working hours, available days, blocked dates, and bookings.
- Confirmed bookings are added to the selected technician's Google Calendar.
- Payment is handled manually through a MariBank QR code, with proof sent to the business Facebook account.
- The app is deployed on Vercel and uses Supabase.

The first release must be easy to understand, mobile-friendly, secure, and intentionally limited to the MVP.

---

## Fixed Product Decisions

### Business

- Brand: **Poin't & Polish**
- Locations: **One**
- Timezone: **Asia/Manila**
- Primary client device: Mobile phone
- Staff dashboard: Mobile and desktop responsive

### Booking flow

1. Client selects a service.
2. Client selects a specific nail technician.
3. Client selects an available date and time.
4. Client enters their information and optional nail reference photo.
5. Client reviews the no-cancellation policy.
6. Client sees the MariBank QR payment instructions.
7. Client confirms the booking.
8. Appointment is immediately reserved and automatically confirmed.
9. Client sends payment proof to the configured Facebook account.
10. Admin manually marks payment as verified.

### Appointment duration

- Default booking duration: **120 minutes**
- The booking calendar must treat the full two hours as occupied.
- Duration remains editable per service for future flexibility.
- Default appointment buffer: **0 minutes**
- Admin can optionally set a custom buffer later.
- Available start times use a configurable interval, default **30 minutes**.

### Booking limits

- Booking window is configurable by the admin.
- Default booking window: **4 weeks ahead**
- Minimum notice is configurable.
- Default minimum notice: **2 hours**
- Past times and unavailable periods must never appear.

### Cancellation and rescheduling

- Clients cannot cancel or reschedule from the website.
- Do not include a client cancellation link.
- Only the Owner/Admin can cancel or reschedule a confirmed appointment.
- The client must accept the no-cancellation policy before booking.
- Admin cancellation sends an email notification and updates Google Calendar.

---

## Payment Process

This is a manual payment workflow, not an online payment gateway.

### Client experience

After completing the booking form:

- Show the uploaded MariBank QR image inside a branded payment card.
- The page may use Poin't & Polish colors, borders, typography, and decoration.
- Preserve the QR image's clarity, proportions, and quiet zone so it remains scannable.
- Display the configured account name.
- Display the required payment amount.
- Provide a button linking to the configured Facebook account or page.
- Instruct the client to send the payment receipt through Facebook Messenger.
- Clearly state that the appointment is already reserved but payment is still awaiting verification.

### Payment statuses

- `unverified`
- `verified`
- `waived`
- `refunded` — stored for future use, not a required MVP workflow

### Booking statuses

- `confirmed`
- `completed`
- `cancelled_by_admin`
- `no_show`

A new booking starts as:

- Booking status: `confirmed`
- Payment status: `unverified`

---

## Roles and Permissions

### Owner/Admin

Can:

- View all appointments
- Create a booking manually
- Cancel or reschedule bookings
- Verify payments
- Manage services
- Manage team members
- Manage all availability
- Create blocked dates and time periods
- Connect and manage Google Calendars
- Edit business settings
- Edit booking policies and notification settings

### Team Member / Nail Technician

Can:

- View only their assigned appointments
- View client details for their appointments
- Manage their recurring working hours
- Add their own blocked dates and leave
- Connect their own Google Calendar
- Mark appointments as completed or no-show

Cannot:

- View another technician's private schedule
- Cancel or reschedule bookings
- Verify payments
- Manage business-wide settings
- Manage other users

Use Supabase Row Level Security for all role restrictions.

---

## Client Information

Required:

- Full name
- Mobile number
- Email address
- Selected service
- Selected nail technician
- Appointment date and time
- Acceptance of the no-cancellation policy

Optional:

- Notes or nail design request
- Nail reference photo

Reference photos are stored privately in Supabase Storage. Only authorized staff can access them.

---

## Services

Each service has:

- Name
- Duration in minutes
- Price
- Optional description
- Optional preparation instructions
- Active/inactive status
- Assigned nail technicians

Seed the app with editable demo services:

1. Gel Manicure — 120 minutes
2. Soft Gel Extensions — 120 minutes
3. Designer Nail Set — 120 minutes
4. Removal + New Set — 120 minutes

These are demo values only and must be editable in the dashboard.

---

## Availability Rules

Each technician has independent availability.

Support:

- Recurring weekly hours
- Multiple working periods in one day
- Date-specific availability overrides
- Full-day blocked dates
- Partial-day blocked periods
- Leave and holidays
- Service assignment
- Google Calendar busy-time blocking

Example:

- Monday: 9:00 AM–7:00 PM
- Break: 1:00 PM–2:00 PM
- Booking duration: 2 hours
- Possible starts: 9:00 AM, 11:00 AM, 2:00 PM, 4:00 PM

Only show a slot when the full service duration fits inside working hours and does not overlap:

- Existing bookings
- Manual blocked periods
- Google Calendar busy events
- Breaks
- Minimum notice
- Booking-window limit

All calculations must use `Asia/Manila`.

---

## Google Calendar

Each nail technician can connect one Google Calendar through Google OAuth.

Required behavior:

- Read busy periods before showing available slots.
- Create a calendar event after a booking is confirmed.
- Update the event when the admin reschedules the booking.
- Cancel or delete the event when the admin cancels the booking.
- Store the Google Calendar event ID on the booking.
- If Google Calendar temporarily fails, keep the booking and show a visible sync warning to the admin.
- Never expose OAuth tokens to the browser.
- Keep tokens in a server-only table with strict RLS or an appropriate secure secret-storage approach.

The database remains the source of truth. Google Calendar is a synchronized external calendar, not the booking database.

---

## Notifications

Use **Resend** for email.

Send:

- Booking confirmation immediately
- Admin/team notification for a new booking
- Reminder approximately 24 hours before
- Reminder approximately 2 hours before
- Payment verified notice
- Admin cancellation notice
- Admin reschedule notice

Use a notification log or reminder table to prevent duplicate emails.

Use Vercel Cron for reminder processing.

SMS is not part of the MVP.

---

## Dashboard Pages

### Owner/Admin

- Overview
- Calendar
- Bookings
- Booking details
- Services
- Team
- Availability
- Blocked dates
- Payment verification
- Google Calendar connections
- Business settings
- Notification settings

### Team Member

- My calendar
- My bookings
- My availability
- My blocked dates
- Google Calendar connection
- Account settings

### Client-facing

- Landing page
- Booking flow
- Booking confirmation
- Payment instructions
- Privacy policy
- Booking policy

---

## Recommended Technology

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Row Level Security
- Google Calendar API
- Resend
- Vercel
- Vercel Cron
- Zod for validation
- React Hook Form where useful
- date-fns or Luxon with explicit timezone handling

Use current stable releases. Do not lock the project to an outdated version unless required by compatibility.

---

## Suggested Database Model

### `profiles`

- `id`
- `full_name`
- `email`
- `role` — `owner` or `technician`
- `active`
- timestamps

### `business_settings`

- `id`
- `business_name`
- `timezone`
- `address`
- `facebook_url`
- `maribank_account_name`
- `maribank_qr_path`
- `minimum_notice_minutes`
- `booking_window_weeks`
- `slot_interval_minutes`
- `default_buffer_minutes`
- `cancellation_policy`
- timestamps

### `services`

- `id`
- `name`
- `description`
- `preparation_instructions`
- `duration_minutes`
- `price`
- `active`
- timestamps

### `technician_services`

- `technician_id`
- `service_id`

### `availability_rules`

- `id`
- `technician_id`
- `weekday`
- `start_time`
- `end_time`
- `active`

Allow multiple rows for the same weekday.

### `availability_overrides`

- `id`
- `technician_id`
- `date`
- `is_available`
- `start_time`
- `end_time`
- `reason`

### `blocked_periods`

- `id`
- `technician_id`
- `starts_at`
- `ends_at`
- `reason`
- `created_by`

### `bookings`

- `id`
- `booking_code`
- `service_id`
- `technician_id`
- `client_name`
- `client_email`
- `client_phone`
- `client_notes`
- `reference_photo_path`
- `starts_at`
- `ends_at`
- `status`
- `payment_status`
- `price_snapshot`
- `duration_snapshot`
- `policy_accepted_at`
- `google_event_id`
- `calendar_sync_status`
- `created_by`
- timestamps

### `calendar_connections`

- `id`
- `technician_id`
- `calendar_id`
- encrypted or server-protected token data
- token expiry
- timestamps

### `notification_log`

- `id`
- `booking_id`
- `notification_type`
- `recipient`
- `sent_at`
- `provider_message_id`
- `status`

---

## Double-Booking Protection

Availability checks in the browser are not enough.

Create bookings through a server-side transaction or Supabase RPC that:

1. Rechecks the technician's availability.
2. Rechecks blocked periods.
3. Rechecks overlapping confirmed bookings.
4. Creates the booking only when the slot remains available.
5. Returns a conflict response when another client reserved it first.

Add a database-level overlap safeguard for active bookings, preferably using a PostgreSQL time-range exclusion constraint scoped by technician.

Cancelled bookings should not block time.

---

## Design Direction

Create a clean, feminine, modern beauty-service interface.

Recommended visual direction:

- Soft neutral background
- One elegant accent color
- High contrast for readability
- Rounded cards and inputs
- Spacious layout
- Refined typography
- Minimal decorative nail-inspired details
- Mobile-first booking experience
- Clear selected states
- Large tap targets

Do not copy YouCanBookMe's branding or visual design. Use it only as a functional reference.

The exact logo, palette, typography, photos, address, QR image, Facebook link, and notification email can be added through the dashboard or environment setup later.

---

## Environment Variables

Prepare `.env.example` containing placeholders for:

- Supabase URL
- Supabase anonymous key
- Supabase service-role key
- Google OAuth client ID
- Google OAuth client secret
- Google OAuth redirect URL
- Resend API key
- Email sender
- App base URL
- Cron secret

Never commit real secrets.

---

## MVP Exclusions

Do not add these in the first release:

- Online card payment
- Automatic payment verification
- GCash API
- SMS
- Multiple locations
- Client accounts
- Memberships
- Loyalty points
- Packages
- Coupons
- Inventory
- Payroll
- Commission tracking
- Public reviews
- Marketplace features
- Complex analytics

---

## Build Order

### Phase 1 — Foundation

- Create the Next.js project.
- Configure Tailwind and shadcn/ui.
- Connect Supabase.
- Add schema, migrations, seed data, authentication, roles, and RLS.
- Build a responsive app shell.

### Phase 2 — Admin setup

- Services
- Team members
- Availability
- Blocked dates
- Business settings
- MariBank QR upload

### Phase 3 — Client booking

- Service selection
- Technician selection
- Date and slot selection
- Client form
- Policy acceptance
- Atomic booking creation
- Confirmation and payment page

### Phase 4 — Operations

- Dashboard calendar
- Booking list and details
- Payment verification
- Admin cancellation and rescheduling
- Completion and no-show actions

### Phase 5 — Integrations

- Google OAuth
- Free/busy checks
- Calendar event synchronization
- Resend emails
- Vercel Cron reminders

### Phase 6 — Quality and deployment

- Validation and error handling
- Loading and empty states
- Accessibility
- Mobile testing
- Booking concurrency tests
- Vercel deployment
- Setup documentation

---

## Definition of Done

The MVP is complete when:

- An admin can create services and technicians.
- Every technician can define separate weekly availability.
- Staff can add blocked dates or partial-day blocks.
- A client can select a service and a specific technician.
- Only genuinely available two-hour slots are displayed.
- Two clients cannot reserve overlapping times.
- A booking is automatically confirmed.
- The MariBank QR payment page displays correctly.
- The client is told to send proof through Facebook.
- Admin can verify payment.
- Clients cannot cancel or reschedule online.
- Admin can cancel or reschedule.
- Google Calendar busy times block availability.
- Confirmed bookings create Google Calendar events.
- Confirmation and reminder emails work.
- Team members can only access their own data.
- The site works well on mobile.
- The application is deployed on Vercel.
- Setup instructions are documented.
