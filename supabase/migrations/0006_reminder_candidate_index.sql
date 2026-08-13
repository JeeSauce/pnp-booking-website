-- Phase 5 Slice 3: support the bounded confirmed-booking scan used by reminders.

create index if not exists bookings_status_starts_idx
  on public.bookings (status, starts_at);
