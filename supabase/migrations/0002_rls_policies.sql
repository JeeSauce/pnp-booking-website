-- =============================================================================
-- Poin't & Polish — Row Level Security
-- Roles: owner (full control) · technician (own data + assigned bookings).
-- Sensitive writes (public booking creation, calendar sync, email logging)
-- run through the service role, which bypasses RLS by design.
-- =============================================================================

alter table public.profiles              enable row level security;
alter table public.business_settings     enable row level security;
alter table public.services              enable row level security;
alter table public.technician_services   enable row level security;
alter table public.availability_rules    enable row level security;
alter table public.availability_overrides enable row level security;
alter table public.blocked_periods       enable row level security;
alter table public.bookings              enable row level security;
alter table public.calendar_connections  enable row level security;
alter table public.notification_log      enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_owner());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_user_role()); -- cannot change own role

drop policy if exists profiles_owner_all on public.profiles;
create policy profiles_owner_all on public.profiles
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- business_settings  (public read for the booking site; owner writes)
-- ---------------------------------------------------------------------------
drop policy if exists business_settings_read on public.business_settings;
create policy business_settings_read on public.business_settings
  for select to anon, authenticated
  using (true);

drop policy if exists business_settings_owner_write on public.business_settings;
create policy business_settings_owner_write on public.business_settings
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- services  (public sees active services; owner sees & manages all)
-- ---------------------------------------------------------------------------
drop policy if exists services_read on public.services;
create policy services_read on public.services
  for select to anon, authenticated
  using (active or public.is_owner());

drop policy if exists services_owner_write on public.services;
create policy services_owner_write on public.services
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- technician_services  (public read for booking; owner manages)
-- ---------------------------------------------------------------------------
drop policy if exists technician_services_read on public.technician_services;
create policy technician_services_read on public.technician_services
  for select to anon, authenticated
  using (true);

drop policy if exists technician_services_owner_write on public.technician_services;
create policy technician_services_owner_write on public.technician_services
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- availability_rules  (private schedules: owner or the technician themselves)
-- Public slot computation happens server-side via the service role.
-- ---------------------------------------------------------------------------
drop policy if exists availability_rules_read on public.availability_rules;
create policy availability_rules_read on public.availability_rules
  for select to authenticated
  using (public.is_owner() or technician_id = auth.uid());

drop policy if exists availability_rules_write on public.availability_rules;
create policy availability_rules_write on public.availability_rules
  for all to authenticated
  using (public.is_owner() or technician_id = auth.uid())
  with check (public.is_owner() or technician_id = auth.uid());

-- ---------------------------------------------------------------------------
-- availability_overrides
-- ---------------------------------------------------------------------------
drop policy if exists availability_overrides_read on public.availability_overrides;
create policy availability_overrides_read on public.availability_overrides
  for select to authenticated
  using (public.is_owner() or technician_id = auth.uid());

drop policy if exists availability_overrides_write on public.availability_overrides;
create policy availability_overrides_write on public.availability_overrides
  for all to authenticated
  using (public.is_owner() or technician_id = auth.uid())
  with check (public.is_owner() or technician_id = auth.uid());

-- ---------------------------------------------------------------------------
-- blocked_periods
-- ---------------------------------------------------------------------------
drop policy if exists blocked_periods_read on public.blocked_periods;
create policy blocked_periods_read on public.blocked_periods
  for select to authenticated
  using (public.is_owner() or technician_id = auth.uid());

drop policy if exists blocked_periods_write on public.blocked_periods;
create policy blocked_periods_write on public.blocked_periods
  for all to authenticated
  using (public.is_owner() or technician_id = auth.uid())
  with check (public.is_owner() or technician_id = auth.uid());

-- ---------------------------------------------------------------------------
-- bookings
-- Owner: full access. Technician: read-only for their assigned bookings.
-- Technician completion/no-show and public creation are done via dedicated
-- server-side RPCs / service role (added in later phases), keeping RLS strict
-- so technicians cannot cancel, reschedule, or verify payment directly.
-- ---------------------------------------------------------------------------
drop policy if exists bookings_owner_all on public.bookings;
create policy bookings_owner_all on public.bookings
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

drop policy if exists bookings_technician_read on public.bookings;
create policy bookings_technician_read on public.bookings
  for select to authenticated
  using (technician_id = auth.uid());

-- ---------------------------------------------------------------------------
-- calendar_connections  (OAuth tokens)
-- Deliberately NO policies: RLS is enabled and denies all client access.
-- Only the service role (server-side calendar sync) can read/write tokens,
-- so refresh tokens never reach any browser.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- notification_log  (owner may audit; writes happen via service role)
-- ---------------------------------------------------------------------------
drop policy if exists notification_log_owner_read on public.notification_log;
create policy notification_log_owner_read on public.notification_log
  for select to authenticated
  using (public.is_owner());
