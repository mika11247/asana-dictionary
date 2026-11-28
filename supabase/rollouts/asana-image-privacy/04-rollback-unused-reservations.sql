-- Only for the reviewed Stage A definitions before any use or Stage B wiring.
-- Verify their ownership and definitions against 04-upload-reservations.sql first.
begin;
set local lock_timeout = '5s';
lock table asana_image_private.settings, asana_image_private.reservations,
  asana_image_private.attempts in access exclusive mode;

do $$
begin
  if exists (select 1 from asana_image_private.reservations)
     or exists (select 1 from asana_image_private.attempts) then
    raise exception 'Stage A has been used; retain the reservation ledger';
  end if;
end;
$$;

drop function public.asana_image_settle(uuid,uuid,text,text);
drop function public.asana_image_reserve(uuid,uuid);
drop function asana_image_private.usage_totals(uuid);
drop table asana_image_private.attempts;
drop table asana_image_private.reservations;
drop table asana_image_private.settings;
drop schema asana_image_private;
commit;
