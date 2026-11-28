begin;
set local lock_timeout = '5s';
lock table public.asanas in share row exclusive mode;
select 1 from asana_image_private.settings where singleton for update;
do $$
begin
  if exists (select 1 from asana_image_private.reservations where reclaim_started_at is not null) then
    raise exception 'Image reclaim has been used; retain Stage C until reviewed';
  end if;
end;
$$;
drop trigger asana_image_reference_tracking_guard on public.asanas;
drop function asana_image_private.guard_image_reclaim();
drop function public.asana_image_maintenance(text, uuid);
alter table asana_image_private.reservations drop column reclaim_started_at;
commit;
