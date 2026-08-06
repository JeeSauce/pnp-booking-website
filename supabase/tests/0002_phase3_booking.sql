begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(7);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '30000000-0000-4000-8000-000000000001',
  'phase3-tech@example.test',
  '{"full_name":"Phase 3 Technician"}'
);

insert into public.services (id, name, duration_minutes, price, sort_order)
values ('40000000-0000-4000-8000-000000000001', 'Phase 3 Service', 120, 1200, 999);

insert into public.bookings (
  service_id,
  technician_id,
  client_name,
  client_email,
  client_phone,
  starts_at,
  ends_at,
  price_snapshot,
  duration_snapshot
)
values (
  '40000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'First Client',
  'first@example.test',
  '09170000001',
  '2026-09-14 01:00+00',
  '2026-09-14 03:00+00',
  1200,
  120
);

select throws_ok(
  $$insert into public.bookings (
      service_id, technician_id, client_name, client_email, client_phone,
      starts_at, ends_at, price_snapshot, duration_snapshot
    ) values (
      '40000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001',
      'Competing Client', 'competing@example.test', '09170000002',
      '2026-09-14 02:00+00', '2026-09-14 04:00+00', 1200, 120
    )$$,
  '23P01',
  null,
  'database rejects an overlapping active booking'
);

update public.bookings
set status = 'cancelled_by_admin'
where client_email = 'first@example.test';

select lives_ok(
  $$insert into public.bookings (
      service_id, technician_id, client_name, client_email, client_phone,
      starts_at, ends_at, price_snapshot, duration_snapshot
    ) values (
      '40000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001',
      'Replacement Client', 'replacement@example.test', '09170000003',
      '2026-09-14 02:00+00', '2026-09-14 04:00+00', 1200, 120
    )$$,
  'cancelled bookings release their occupied time'
);

select is(
  (select count(*) from public.bookings where status <> 'cancelled_by_admin'),
  1::bigint,
  'exactly one overlapping booking remains active'
);

insert into storage.objects (bucket_id, name, owner_id, metadata)
values (
  'reference-photos',
  'phase3/private-reference.jpg',
  '30000000-0000-4000-8000-000000000001',
  '{}'::jsonb
);

select is(
  (select public from storage.buckets where id = 'reference-photos'),
  false,
  'reference photo bucket is private'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is(
  (select count(*) from storage.objects where name = 'phase3/private-reference.jpg'),
  0::bigint,
  'anonymous clients cannot read reference photos'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name, metadata)
    values ('reference-photos', 'phase3/anonymous-upload.jpg', '{}'::jsonb)$$,
  '42501',
  null,
  'anonymous clients cannot upload reference photos directly'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  (select count(*) from storage.objects where name = 'phase3/private-reference.jpg'),
  1::bigint,
  'authenticated staff can read private reference photos'
);

select * from finish();
rollback;
