-- =============================================================================
-- Poin't & Polish — Initial schema
-- Phase 1: enums, tables, indexes, double-booking safeguard, triggers.
-- Timezone of record is Asia/Manila; all instants are stored as timestamptz.
-- =============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "btree_gist";  -- exclusion constraint on (uuid, tstzrange)

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('owner', 'technician');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.booking_status as enum
    ('confirmed', 'completed', 'cancelled_by_admin', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum
    ('unverified', 'verified', 'waived', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.calendar_sync_status as enum
    ('pending', 'synced', 'failed', 'not_connected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum (
    'booking_confirmation',
    'new_booking_admin',
    'reminder_24h',
    'reminder_2h',
    'payment_verified',
    'cancelled_by_admin',
    'rescheduled_by_admin'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

-- Touch updated_at on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Short, human-friendly booking reference (e.g. PNP-9F3A21).
create or replace function public.gen_booking_code()
returns text
language sql
volatile
as $$
  select 'PNP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
$$;

-- ---------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default 'New staff member',
  email       text not null,
  role        public.user_role not null default 'technician',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role lookup that bypasses RLS to avoid recursive policy evaluation.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner' and active
  );
$$;

-- Create a profile automatically whenever an auth user is created.
-- Role/full_name may be provided via user metadata when inviting staff.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'New staff member'),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'technician')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- business_settings  (single row)
-- ---------------------------------------------------------------------------
create table if not exists public.business_settings (
  id                      uuid primary key default gen_random_uuid(),
  business_name           text not null default 'Poin''t & Polish',
  timezone                text not null default 'Asia/Manila',
  address                 text,
  facebook_url            text,
  maribank_account_name   text,
  maribank_qr_path        text,
  payment_amount_note     text,
  minimum_notice_minutes  integer not null default 120 check (minimum_notice_minutes >= 0),
  booking_window_weeks    integer not null default 4   check (booking_window_weeks between 1 and 52),
  slot_interval_minutes   integer not null default 30  check (slot_interval_minutes between 5 and 240),
  default_buffer_minutes  integer not null default 0   check (default_buffer_minutes >= 0),
  cancellation_policy     text,
  notification_email      text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger business_settings_set_updated_at
  before update on public.business_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  description               text,
  preparation_instructions  text,
  duration_minutes          integer not null default 120 check (duration_minutes > 0),
  price                     numeric(10, 2) not null check (price >= 0),
  active                    boolean not null default true,
  sort_order                integer not null default 0,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists services_active_idx on public.services (active, sort_order);

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- technician_services  (which technicians offer which service)
-- ---------------------------------------------------------------------------
create table if not exists public.technician_services (
  technician_id  uuid not null references public.profiles (id) on delete cascade,
  service_id     uuid not null references public.services (id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (technician_id, service_id)
);

create index if not exists technician_services_service_idx
  on public.technician_services (service_id);

-- ---------------------------------------------------------------------------
-- availability_rules  (recurring weekly hours; multiple rows per weekday ok)
-- weekday: 0 = Sunday ... 6 = Saturday
-- ---------------------------------------------------------------------------
create table if not exists public.availability_rules (
  id             uuid primary key default gen_random_uuid(),
  technician_id  uuid not null references public.profiles (id) on delete cascade,
  weekday        smallint not null check (weekday between 0 and 6),
  start_time     time not null,
  end_time       time not null,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists availability_rules_tech_weekday_idx
  on public.availability_rules (technician_id, weekday);

-- ---------------------------------------------------------------------------
-- availability_overrides  (date-specific availability or day off)
-- ---------------------------------------------------------------------------
create table if not exists public.availability_overrides (
  id             uuid primary key default gen_random_uuid(),
  technician_id  uuid not null references public.profiles (id) on delete cascade,
  date           date not null,
  is_available   boolean not null default false,
  start_time     time,
  end_time       time,
  reason         text,
  created_at     timestamptz not null default now(),
  -- When available, a valid time window is required.
  check (
    (is_available = false)
    or (start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index if not exists availability_overrides_tech_date_idx
  on public.availability_overrides (technician_id, date);

-- ---------------------------------------------------------------------------
-- blocked_periods  (partial-day or multi-day manual blocks)
-- ---------------------------------------------------------------------------
create table if not exists public.blocked_periods (
  id             uuid primary key default gen_random_uuid(),
  technician_id  uuid not null references public.profiles (id) on delete cascade,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  reason         text,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists blocked_periods_tech_idx
  on public.blocked_periods (technician_id, starts_at);

-- Fast overlap lookups for availability checks.
create index if not exists blocked_periods_range_idx
  on public.blocked_periods using gist (technician_id, tstzrange(starts_at, ends_at));

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id                    uuid primary key default gen_random_uuid(),
  booking_code          text not null unique default public.gen_booking_code(),
  service_id            uuid not null references public.services (id) on delete restrict,
  technician_id         uuid not null references public.profiles (id) on delete restrict,
  client_name           text not null,
  client_email          text not null,
  client_phone          text not null,
  client_notes          text,
  reference_photo_path  text,
  starts_at             timestamptz not null,
  ends_at               timestamptz not null,
  status                public.booking_status not null default 'confirmed',
  payment_status        public.payment_status not null default 'unverified',
  price_snapshot        numeric(10, 2) not null check (price_snapshot >= 0),
  duration_snapshot     integer not null check (duration_snapshot > 0),
  policy_accepted_at    timestamptz,
  google_event_id       text,
  calendar_sync_status  public.calendar_sync_status not null default 'not_connected',
  created_by            uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (ends_at > starts_at),

  -- DATABASE-LEVEL DOUBLE-BOOKING PROTECTION.
  -- No two non-cancelled bookings for the same technician may overlap in time.
  -- Cancelled bookings are excluded, so they free the slot.
  constraint bookings_no_overlap exclude using gist (
    technician_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'cancelled_by_admin')
);

create index if not exists bookings_technician_starts_idx
  on public.bookings (technician_id, starts_at);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_payment_status_idx on public.bookings (payment_status);

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- calendar_connections  (server-only OAuth tokens; locked down by RLS)
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_connections (
  id                uuid primary key default gen_random_uuid(),
  technician_id     uuid not null unique references public.profiles (id) on delete cascade,
  calendar_id       text not null default 'primary',
  access_token      text not null,
  refresh_token     text not null,
  token_expires_at  timestamptz,
  scope             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger calendar_connections_set_updated_at
  before update on public.calendar_connections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notification_log  (idempotent email tracking)
-- ---------------------------------------------------------------------------
create table if not exists public.notification_log (
  id                   uuid primary key default gen_random_uuid(),
  booking_id           uuid references public.bookings (id) on delete cascade,
  notification_type    public.notification_type not null,
  recipient            text not null,
  sent_at              timestamptz,
  provider_message_id  text,
  status               text not null default 'pending',
  created_at           timestamptz not null default now()
);

-- One send per (booking, type) — the guard against duplicate emails/reminders.
create unique index if not exists notification_log_booking_type_uidx
  on public.notification_log (booking_id, notification_type)
  where booking_id is not null;
