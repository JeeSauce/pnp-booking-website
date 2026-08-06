-- =============================================================================
-- Poin't & Polish — Seed data (DEMO)
-- Safe to run repeatedly: only inserts when the tables are empty.
-- All values are editable later from the dashboard. Replace before launch.
-- Run automatically by `supabase db reset`, or manually in the SQL editor.
-- =============================================================================

-- Single business-settings row with editable demo values ---------------------
insert into public.business_settings (
  business_name,
  timezone,
  address,
  facebook_url,
  maribank_account_name,
  payment_amount_note,
  minimum_notice_minutes,
  booking_window_weeks,
  slot_interval_minutes,
  default_buffer_minutes,
  cancellation_policy,
  notification_email
)
select
  'Poin''t & Polish',
  'Asia/Manila',
  '123 Example Ave, Makati City, Metro Manila (demo address)',
  'https://facebook.com/pointandpolish',
  'Poin''t & Polish (demo account)',
  'Please pay the full service price to reserve your slot.',
  120,   -- minimum notice (2 hours)
  4,     -- booking window (weeks)
  30,    -- slot interval (minutes)
  0,     -- default buffer (minutes)
  'Appointments are reserved instantly and cannot be cancelled or rescheduled online. Contact the studio for any changes.',
  'bookings@example.com'
where not exists (select 1 from public.business_settings);

-- Demo services (all 120-minute sessions) ------------------------------------
insert into public.services (name, description, duration_minutes, price, active, sort_order)
select * from (values
  ('Gel Manicure',
   'A long-wearing, high-shine gel finish with cuticle care and shaping.',
   120, 850.00,  true, 1),
  ('Soft Gel Extensions',
   'Lightweight soft-gel tips sculpted and finished to your desired length.',
   120, 1400.00, true, 2),
  ('Designer Nail Set',
   'A bespoke set with hand-painted art, textures, or embellishments.',
   120, 1800.00, true, 3),
  ('Removal + New Set',
   'Gentle removal of previous work followed by a fresh, healthy new set.',
   120, 1600.00, true, 4)
) as v(name, description, duration_minutes, price, active, sort_order)
where not exists (select 1 from public.services);

-- ---------------------------------------------------------------------------
-- Staff accounts are created through Supabase Auth (see docs/SETUP.md), which
-- auto-creates a matching profile. To promote the first account to owner, run:
--
--   update public.profiles set role = 'owner' where email = 'you@studio.com';
--
-- Optional convenience helper to do the same by email:
-- ---------------------------------------------------------------------------
create or replace function public.promote_to_owner(target_email text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set role = 'owner' where email = target_email;
$$;
