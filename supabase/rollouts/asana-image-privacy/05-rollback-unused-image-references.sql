begin;
set local lock_timeout = '5s';
lock table public.asanas in share row exclusive mode;
select 1 from asana_image_private.settings where singleton for update;
lock table storage.objects in share row exclusive mode;

do $$
begin
  if to_regprocedure('public.asana_image_maintenance(text,uuid)') is not null
    or to_regprocedure('asana_image_private.guard_image_reclaim()') is not null
    or exists (select 1 from pg_attribute
      where attrelid = 'asana_image_private.reservations'::regclass
        and attname = 'reclaim_started_at' and not attisdropped) then
    raise exception 'Roll back Stage C before Stage B';
  end if;
  if exists (select 1 from asana_image_private.reservations)
    or exists (select 1 from asana_image_private.attempts)
    or exists (select 1 from public.asanas where private_image_path is not null)
    or exists (select 1 from storage.objects where bucket_id = 'asana-images-private') then
    raise exception 'Stage B safety gate: image storage or reservations have been used';
  end if;
end;
$$;

drop trigger asana_image_reference_tracking on public.asanas;
drop function asana_image_private.track_asana_image_reference();
alter table asana_image_private.reservations drop column unreferenced_since;

create policy asana_private_delete_unused on storage.objects for delete to authenticated
using (
  bucket_id = 'asana-images-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not coalesce((select auth.jwt())->>'is_anonymous' = 'true', false)
  and not exists (select 1 from public.asanas a where a.private_image_path = name)
);

commit;
