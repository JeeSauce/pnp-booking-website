-- =============================================================================
-- Poin't & Polish — Phase 2 database access hardening
--
-- Phase 1 enabled RLS but did not grant the API roles ordinary DML privileges,
-- so PostgREST requests were rejected before policies could be evaluated. This
-- migration also closes two profile privilege-escalation paths discovered while
-- verifying the local database.
-- =============================================================================

-- Let API roles reach the tables that RLS protects. Anonymous access stays
-- intentionally limited to the three public booking-catalog tables.
grant usage on schema public to anon, authenticated, service_role;

grant select
  on table public.business_settings,
               public.services,
               public.technician_services
  to anon;

grant select, insert, update, delete
  on all tables in schema public
  to authenticated;

grant all privileges
  on all tables in schema public
  to service_role;

-- Future tables still require RLS, but receive the baseline privileges needed
-- for their policies to be evaluated through PostgREST.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges for role postgres in schema public
  grant all privileges on tables to service_role;

-- Never trust user-controlled signup metadata to assign an owner role. The
-- first owner is promoted explicitly by trusted setup SQL or the service role;
-- the Phase 2 team action creates technicians only.
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
    'technician'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- The convenience setup helper is security-definer and must never be callable
-- by browser roles. Trusted server/setup code may still use it.
-- Define it here before seed.sql runs; CREATE OR REPLACE in the seed preserves
-- the restricted function ACL established below.
create or replace function public.promote_to_owner(target_email text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set role = 'owner' where email = target_email;
$$;

revoke execute on function public.promote_to_owner(text) from public, anon, authenticated;
grant execute on function public.promote_to_owner(text) to service_role;

-- A technician may update their own display name through the existing profile
-- policy, but cannot reactivate themselves or change identity/authorization
-- fields. Owners and trusted server/database operations remain unrestricted.
create or replace function public.protect_profile_authorization_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and not public.is_owner() then
    if new.email is distinct from old.email
      or new.role is distinct from old.role
      or new.active is distinct from old.active then
      raise exception 'Only an owner may change profile authorization fields'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_authorization_fields on public.profiles;
create trigger profiles_protect_authorization_fields
  before update on public.profiles
  for each row execute function public.protect_profile_authorization_fields();

revoke execute on function public.protect_profile_authorization_fields() from public, anon, authenticated;
grant execute on function public.protect_profile_authorization_fields() to service_role;

-- Schedule integrity must hold even when an authenticated client calls
-- PostgREST directly instead of using the validated server actions.
alter table public.availability_rules
  add constraint availability_rules_no_overlap
  exclude using gist (
    technician_id with =,
    weekday with =,
    int4range(
      extract(epoch from start_time)::integer,
      extract(epoch from end_time)::integer,
      '[)'
    ) with &&
  )
  where (active);

alter table public.availability_overrides
  add constraint availability_overrides_one_per_date
  unique (technician_id, date);
