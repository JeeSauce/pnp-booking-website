begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(19);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000001', 'rls-owner@example.test', '{"full_name":"RLS Owner","role":"owner"}'),
  ('10000000-0000-4000-8000-000000000002', 'rls-tech-one@example.test', '{"full_name":"RLS Tech One","role":"technician"}'),
  ('10000000-0000-4000-8000-000000000003', 'rls-tech-two@example.test', '{"full_name":"RLS Tech Two","role":"technician"}'),
  ('10000000-0000-4000-8000-000000000004', 'rls-attacker@example.test', '{"full_name":"RLS Attacker","role":"owner"}');

select is(
  (select role::text from public.profiles where email = 'rls-attacker@example.test'),
  'technician',
  'signup metadata cannot create an owner'
);

update public.profiles
set role = 'owner'
where id = '10000000-0000-4000-8000-000000000001';

insert into public.services (id, name, duration_minutes, price, sort_order)
values ('20000000-0000-4000-8000-000000000001', 'RLS Service', 120, 1000, 99);

insert into public.availability_rules (technician_id, weekday, start_time, end_time)
values
  ('10000000-0000-4000-8000-000000000002', 1, '09:00', '17:00'),
  ('10000000-0000-4000-8000-000000000003', 2, '10:00', '18:00');

insert into public.availability_overrides (technician_id, date, is_available, reason)
values ('10000000-0000-4000-8000-000000000002', '2026-09-10', false, 'Fixture day off');

insert into public.blocked_periods (technician_id, starts_at, ends_at, created_by)
values
  ('10000000-0000-4000-8000-000000000002', '2026-09-01 01:00+00', '2026-09-01 03:00+00', '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000003', '2026-09-02 01:00+00', '2026-09-02 03:00+00', '10000000-0000-4000-8000-000000000001');

insert into public.bookings (
  service_id, technician_id, client_name, client_email, client_phone,
  starts_at, ends_at, price_snapshot, duration_snapshot
)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Client One', 'one@example.test', '09170000001', '2026-09-03 01:00+00', '2026-09-03 03:00+00', 1000, 120),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'Client Two', 'two@example.test', '09170000002', '2026-09-04 01:00+00', '2026-09-04 03:00+00', 1000, 120);

insert into public.calendar_connections (technician_id, access_token, refresh_token)
values
  ('10000000-0000-4000-8000-000000000002', 'test-access-one', 'test-refresh-one'),
  ('10000000-0000-4000-8000-000000000003', 'test-access-two', 'test-refresh-two');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  (select count(*) from public.profiles where id between '10000000-0000-4000-8000-000000000001' and '10000000-0000-4000-8000-000000000004'),
  4::bigint,
  'owner sees every fixture profile'
);
select is(
  (select count(*) from public.availability_rules where technician_id in ('10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003')),
  2::bigint,
  'owner sees all fixture availability'
);
select is(
  (select count(*) from public.blocked_periods where technician_id in ('10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003')),
  2::bigint,
  'owner sees all fixture blocks'
);
select is(
  (select count(*) from public.bookings where technician_id in ('10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003')),
  2::bigint,
  'owner sees all fixture bookings'
);
select is((select count(*) from public.calendar_connections), 0::bigint, 'owner browser cannot read calendar tokens');

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select is((select count(*) from public.profiles), 1::bigint, 'technician sees only their profile');
select is((select count(*) from public.availability_rules), 1::bigint, 'technician sees only their availability');
select is((select count(*) from public.blocked_periods), 1::bigint, 'technician sees only their blocks');
select is((select count(*) from public.bookings), 1::bigint, 'technician sees only assigned bookings');
select is((select count(*) from public.calendar_connections), 0::bigint, 'technician cannot read calendar tokens');

select throws_ok(
  $$insert into public.availability_rules (technician_id, weekday, start_time, end_time)
    values ('10000000-0000-4000-8000-000000000003', 3, '09:00', '12:00')$$,
  '42501',
  null,
  'technician cannot write another schedule'
);

select throws_ok(
  $$insert into public.availability_rules (technician_id, weekday, start_time, end_time)
    values ('10000000-0000-4000-8000-000000000002', 1, '12:00', '18:00')$$,
  '23P01',
  null,
  'database rejects overlapping recurring hours'
);

select throws_ok(
  $$insert into public.availability_overrides (technician_id, date, is_available)
    values ('10000000-0000-4000-8000-000000000002', '2026-09-10', false)$$,
  '23505',
  null,
  'database rejects duplicate date overrides'
);

select throws_ok(
  $$update public.profiles set active = false where id = '10000000-0000-4000-8000-000000000002'$$,
  '42501',
  'Only an owner may change profile authorization fields',
  'technician cannot deactivate or reactivate themselves'
);

select ok(
  not has_function_privilege('anon', 'public.promote_to_owner(text)', 'EXECUTE'),
  'anonymous role cannot promote an owner'
);
select ok(
  not has_function_privilege('authenticated', 'public.promote_to_owner(text)', 'EXECUTE'),
  'authenticated role cannot promote an owner'
);
select ok(
  has_function_privilege('service_role', 'public.promote_to_owner(text)', 'EXECUTE'),
  'service role may perform trusted owner setup'
);
select ok(
  not has_table_privilege('anon', 'public.calendar_connections', 'SELECT'),
  'anonymous clients cannot select calendar connections'
);

select * from finish();
rollback;
