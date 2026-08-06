-- =============================================================================
-- Poin't & Polish — Storage buckets
--   reference-photos : PRIVATE. Client nail reference images. Staff read only.
--   business-assets  : PUBLIC.  MariBank QR and brand images shown to clients.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('reference-photos', 'reference-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('business-assets', 'business-assets', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- reference-photos: authenticated staff may read/manage. Client uploads during
-- booking are performed server-side via signed URLs / the service role
-- (Phase 3), so there is no anon policy here.
-- ---------------------------------------------------------------------------
drop policy if exists reference_photos_staff_read on storage.objects;
create policy reference_photos_staff_read on storage.objects
  for select to authenticated
  using (bucket_id = 'reference-photos');

drop policy if exists reference_photos_staff_write on storage.objects;
create policy reference_photos_staff_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'reference-photos');

drop policy if exists reference_photos_staff_modify on storage.objects;
create policy reference_photos_staff_modify on storage.objects
  for update to authenticated
  using (bucket_id = 'reference-photos')
  with check (bucket_id = 'reference-photos');

drop policy if exists reference_photos_owner_delete on storage.objects;
create policy reference_photos_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'reference-photos' and public.is_owner());

-- ---------------------------------------------------------------------------
-- business-assets: public read (bucket is public); only the owner may write.
-- ---------------------------------------------------------------------------
drop policy if exists business_assets_owner_write on storage.objects;
create policy business_assets_owner_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'business-assets' and public.is_owner());

drop policy if exists business_assets_owner_modify on storage.objects;
create policy business_assets_owner_modify on storage.objects
  for update to authenticated
  using (bucket_id = 'business-assets' and public.is_owner())
  with check (bucket_id = 'business-assets' and public.is_owner());

drop policy if exists business_assets_owner_delete on storage.objects;
create policy business_assets_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'business-assets' and public.is_owner());
