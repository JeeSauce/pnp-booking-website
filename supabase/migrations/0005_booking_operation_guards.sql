-- Phase 4: preserve booking lifecycle invariants for every write path.

create or replace function public.enforce_booking_operation_guards()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status and not (
    old.status = 'confirmed'
    and new.status in ('completed', 'no_show', 'cancelled_by_admin')
  ) then
    raise exception using
      errcode = '23514',
      message = 'invalid booking status transition';
  end if;

  if new.payment_status is distinct from old.payment_status and not (
    old.payment_status = 'unverified'
    and new.payment_status in ('verified', 'waived')
  ) then
    raise exception using
      errcode = '23514',
      message = 'invalid booking payment transition';
  end if;

  if new.service_id is distinct from old.service_id
    or new.price_snapshot is distinct from old.price_snapshot
    or new.duration_snapshot is distinct from old.duration_snapshot
    or new.booking_code is distinct from old.booking_code
  then
    raise exception using
      errcode = '23514',
      message = 'booking snapshots cannot be changed';
  end if;

  if new.technician_id is distinct from old.technician_id
    or new.starts_at is distinct from old.starts_at
    or new.ends_at is distinct from old.ends_at
  then
    if old.status <> 'confirmed' or new.status <> 'confirmed' then
      raise exception using
        errcode = '23514',
        message = 'only confirmed bookings can be rescheduled';
    end if;

    if new.ends_at <> new.starts_at + make_interval(mins => new.duration_snapshot) then
      raise exception using
        errcode = '23514',
        message = 'booking end must match its duration snapshot';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_booking_operation_guards() from public;

drop trigger if exists bookings_operation_guards on public.bookings;
create trigger bookings_operation_guards
  before update on public.bookings
  for each row execute function public.enforce_booking_operation_guards();

-- Reference photos remain private and follow the same booking visibility rule.
drop policy if exists reference_photos_staff_read on storage.objects;
drop policy if exists reference_photos_authorized_read on storage.objects;
create policy reference_photos_authorized_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reference-photos'
    and exists (
      select 1
      from public.bookings
      where bookings.reference_photo_path = storage.objects.name
        and (public.is_owner() or bookings.technician_id = auth.uid())
    )
  );
