-- Apply only after reconciliation and confirmation of a private-capable rollback deployment.
begin;
lock table public.asanas in share mode;
do $$
begin
  if exists (
    select 1 from public.asanas a
    where a.image_url like '%/storage/v1/object/public/asana-images/%'
      and a.private_image_path is null
  ) then
    raise exception 'Legacy image references remain';
  end if;
end;
$$;
drop policy "Allow public read from asana images" on storage.objects;
update storage.buckets set public = false where id = 'asana-images';
commit;
