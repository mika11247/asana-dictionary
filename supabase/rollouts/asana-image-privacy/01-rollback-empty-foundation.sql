-- Only after confirming all definitions belong to this rollout.
-- Keep private uploads and migration disabled until rollback is complete.
begin;
set local lock_timeout = '5s';
lock table public.asanas in access exclusive mode;

do $$
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'asana-images-private' and name = id and public is false
      and file_size_limit = 5242880 and allowed_mime_types = array['image/webp']
  ) or exists (
    select 1 from storage.objects where bucket_id = 'asana-images-private'
  ) or exists (
    select 1 from public.asanas where private_image_path is not null
  ) then
    raise exception 'Unsafe rollback: verify bucket settings, objects and private image references';
  end if;
end;
$$;

drop policy asana_private_delete_unused on storage.objects;
drop policy asana_private_read on storage.objects;
drop trigger check_asana_private_image on public.asanas;
drop function public.check_asana_private_image();
drop function public.asana_image_migration_batch(text, integer);
drop index public.asanas_private_image_path_idx;
alter table public.asanas drop column private_image_path;
commit;

-- Delete the still-empty bucket through the Storage API, after DB verification.
