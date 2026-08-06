begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(14);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '50000000-0000-4000-8000-000000000001',
    'phase4-owner@example.test',
    '{"full_name":"Phase 4 Owner","role":"owner"}'
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    'phase4-tech-one@example.test',
    '{"full_name":"Phase 4 Tech One","role":"technician"}'
  ),
  (
    '50000000-0000-4000-8000-000000000003',
    'phase4-tech-two@example.test',
    '{"full_name":"Phase 4 Tech Two","role":"technician"}'
  );


-- Signup metadata cannot self-assign owner; promote the trusted fixture as postgres.
update public.profiles
set role = 'owner'
where id = '50000000-0000-4000-8000-000000000001';
insert into public.services (id, name, duration_minutes, price, sort_order)
values ('60000000-0000-4000-8000-000000000001', 'Phase 4 Service', 120, 1400, 999);

insert into public.bookings (
  id, service_id, technician_id, client_name, client_email, client_phone,
  starts_at, ends_at, price_snapshot, duration_snapshot
)
values
  (
    '70000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000002',
    'Primary Client', 'primary@example.test', '09170000001',
    '2026-10-01 01:00+00', '2026-10-01 03:00+00', 1400, 120
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000002',
    'Cancellation Client', 'cancel@example.test', '09170000002',
    '2026-10-01 04:00+00', '2026-10-01 06:00+00', 1400, 120
  ),
  (
    '70000000-0000-4000-8000-000000000003',
    '60000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000002',
    'Outcome Client', 'outcome@example.test', '09170000003',
    '2026-10-01 07:00+00', '2026-10-01 09:00+00', 1400, 120
  ),
  (
    '70000000-0000-4000-8000-000000000004',
    '60000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000003',
    'Other Technician Client', 'other@example.test', '09170000004',
    '2026-10-01 01:00+00', '2026-10-01 03:00+00', 1400, 120
  );

update public.bookings
set reference_photo_path = case id
  when '70000000-0000-4000-8000-000000000001' then 'phase4/own-reference.jpg'
  when '70000000-0000-4000-8000-000000000004' then 'phase4/other-reference.jpg'
  else reference_photo_path
end
where id in (
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000004'
);

insert into storage.objects (bucket_id, name, metadata)
values
  ('reference-photos', 'phase4/own-reference.jpg', '{}'::jsonb),
  ('reference-photos', 'phase4/other-reference.jpg', '{}'::jsonb);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"50000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select is(
  (select count(*) from storage.objects where name = 'phase4/own-reference.jpg'),
  1::bigint,
  'technician can read a private reference photo attached to their own booking'
);

select is(
  (select count(*) from storage.objects where name = 'phase4/other-reference.jpg'),
  0::bigint,
  'technician cannot read another technician booking reference photo'
);

update public.bookings
set status = 'cancelled_by_admin'
where id = '70000000-0000-4000-8000-000000000001';

reset role;
select is(
  (select status from public.bookings where id = '70000000-0000-4000-8000-000000000001'),
  'confirmed'::public.booking_status,
  'technician cannot cancel their booking through PostgREST'
);

set local role authenticated;
update public.bookings
set starts_at = '2026-10-02 01:00+00', ends_at = '2026-10-02 03:00+00'
where id = '70000000-0000-4000-8000-000000000001';

reset role;
select is(
  (select starts_at from public.bookings where id = '70000000-0000-4000-8000-000000000001'),
  '2026-10-01 01:00+00'::timestamptz,
  'technician cannot reschedule their booking through PostgREST'
);

set local role authenticated;
update public.bookings
set payment_status = 'verified'
where id = '70000000-0000-4000-8000-000000000001';

reset role;
select is(
  (select payment_status from public.bookings where id = '70000000-0000-4000-8000-000000000001'),
  'unverified'::public.payment_status,
  'technician cannot verify payment through PostgREST'
);

set local role authenticated;
update public.bookings
set client_notes = 'unauthorized edit'
where id = '70000000-0000-4000-8000-000000000004';

reset role;
select is(
  (select client_notes from public.bookings where id = '70000000-0000-4000-8000-000000000004'),
  null,
  'technician cannot edit another technician booking'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"50000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

update public.bookings
set payment_status = 'verified'
where id = '70000000-0000-4000-8000-000000000001';

select is(
  (select payment_status from public.bookings where id = '70000000-0000-4000-8000-000000000001'),
  'verified'::public.payment_status,
  'owner can verify payment'
);

update public.bookings
set status = 'cancelled_by_admin'
where id = '70000000-0000-4000-8000-000000000002';

select is(
  (select status from public.bookings where id = '70000000-0000-4000-8000-000000000002'),
  'cancelled_by_admin'::public.booking_status,
  'owner can cancel a confirmed booking'
);

update public.bookings
set starts_at = '2026-10-01 10:00+00', ends_at = '2026-10-01 12:00+00'
where id = '70000000-0000-4000-8000-000000000001';

select is(
  (select starts_at from public.bookings where id = '70000000-0000-4000-8000-000000000001'),
  '2026-10-01 10:00+00'::timestamptz,
  'owner can reschedule a confirmed booking'
);

update public.bookings
set status = 'completed'
where id = '70000000-0000-4000-8000-000000000003';

select is(
  (select status from public.bookings where id = '70000000-0000-4000-8000-000000000003'),
  'completed'::public.booking_status,
  'owner can complete a confirmed booking'
);

select throws_ok(
  $$update public.bookings
    set status = 'confirmed'
    where id = '70000000-0000-4000-8000-000000000003'$$,
  '23514',
  'invalid booking status transition',
  'terminal booking statuses cannot be reversed'
);

select throws_ok(
  $$update public.bookings
    set payment_status = 'unverified'
    where id = '70000000-0000-4000-8000-000000000001'$$,
  '23514',
  'invalid booking payment transition',
  'verified payment cannot be reverted'
);

select throws_ok(
  $$update public.bookings
    set technician_id = '50000000-0000-4000-8000-000000000003',
        starts_at = '2026-10-01 01:00+00',
        ends_at = '2026-10-01 03:00+00'
    where id = '70000000-0000-4000-8000-000000000001'$$,
  '23P01',
  null,
  'owner reschedule still respects the overlap constraint'
);

select throws_ok(
  $$update public.bookings
    set starts_at = '2026-10-02 07:00+00', ends_at = '2026-10-02 09:00+00'
    where id = '70000000-0000-4000-8000-000000000003'$$,
  '23514',
  'only confirmed bookings can be rescheduled',
  'completed bookings cannot be rescheduled'
);

reset role;
select * from finish();
rollback;
