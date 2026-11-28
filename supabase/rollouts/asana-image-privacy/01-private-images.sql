begin;
set local lock_timeout = '5s';

-- The operator provisions the bucket through the Storage API before applying this SQL.
do $$
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'asana-images-private' and name = id and public is false
      and file_size_limit = 5242880 and allowed_mime_types = array['image/webp']
  ) or exists (
    select 1 from storage.objects where bucket_id = 'asana-images-private'
  ) then
    raise exception 'Expected an empty private WebP bucket provisioned through the Storage API';
  end if;
end;
$$;

-- Plain CREATE/ADD intentionally rejects existing definitions, including a replay.
-- A conflict rolls back the whole transaction instead of accepting a mismatched object.

alter table public.asanas add column private_image_path text;

create policy asana_private_read on storage.objects for select to authenticated
using (
  bucket_id = 'asana-images-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not coalesce((select auth.jwt())->>'is_anonymous' = 'true', false)
);

-- Uploads must pass the server's byte-level WebP validation.
-- There are deliberately no user INSERT or UPDATE policies on this bucket.
create policy asana_private_delete_unused on storage.objects for delete to authenticated
using (
  bucket_id = 'asana-images-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not coalesce((select auth.jwt())->>'is_anonymous' = 'true', false)
  and not exists (select 1 from public.asanas a where a.private_image_path = name)
);

create function public.check_asana_private_image() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.private_image_path is not null and (
    new.user_id is null or new.is_demo is true
    or split_part(new.private_image_path, '/', 1) <> new.user_id::text
    or new.private_image_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
    or not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'asana-images-private' and o.name = new.private_image_path
    )
  ) then
    raise exception using errcode = '23514', message = 'Invalid private image reference';
  end if;
  return new;
end;
$$;
revoke all on function public.check_asana_private_image() from public, anon, authenticated;

create trigger check_asana_private_image
before insert or update of private_image_path, user_id, is_demo on public.asanas
for each row execute function public.check_asana_private_image();

create index asanas_private_image_path_idx on public.asanas (private_image_path)
where private_image_path is not null;

-- Batch inputs are internal only and never printed by the operator script.
create function public.asana_image_migration_batch(project_origin text, batch_size integer)
returns table (
  asana_id bigint, owner_uuid uuid, legacy_url text, source_path text,
  destination_path text, expected_size bigint
)
language sql stable set search_path = ''
as $$
  select a.id, a.user_id, a.image_url, o.name, a.user_id::text || '/' || o.id::text || '.webp',
         (o.metadata->>'size')::bigint
  from public.asanas a
  join storage.objects o on o.bucket_id = 'asana-images'
    and a.image_url = project_origin || '/storage/v1/object/public/asana-images/' || o.name
    and o.owner_id = a.user_id::text
  where a.private_image_path is null and a.is_demo is not true
    and o.name ~ '^[a-zA-Z0-9._-]+$' and o.metadata->>'mimetype' = 'image/webp'
  order by a.id limit greatest(0, least(batch_size, 25));
$$;
revoke all on function public.asana_image_migration_batch(text, integer) from public, anon, authenticated;
grant execute on function public.asana_image_migration_batch(text, integer) to service_role;

commit;
