begin;
set local lock_timeout = '5s';

-- For managed uploads never attached to an asana, the confirmation timestamp
-- (updated_at) starts the grace period. This column tracks later detachments.
alter table asana_image_private.reservations add column unreferenced_since timestamptz;

-- Direct owner deletion would bypass both the ledger and the reference lock.
-- Storage deletion for this bucket remains a trusted operator operation.
drop policy asana_private_delete_unused on storage.objects;

create function asana_image_private.track_asana_image_reference() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  old_path text;
  new_path text;
  managed_state text;
begin
  if tg_op <> 'INSERT' then old_path := old.private_image_path; end if;
  if tg_op <> 'DELETE' then new_path := new.private_image_path; end if;

  if old_path is distinct from new_path then
    if new_path is not null and split_part(new_path, '/', 1) is distinct from new.user_id::text then
      raise exception using errcode = '23514', message = 'Invalid private image reference';
    end if;

    -- Use the same first lock as the reservation RPCs and future recovery.
    perform 1 from asana_image_private.settings where singleton for update;
    if not found then raise exception 'Image reservation settings unavailable'; end if;

    if new_path is not null then
      select state into managed_state
      from asana_image_private.reservations where object_path = new_path;
      if found then
        if managed_state <> 'confirmed' then
          raise exception using errcode = '23514', message = 'Private image is not confirmed';
        end if;
        update asana_image_private.reservations set unreferenced_since = null
        where object_path = new_path and unreferenced_since is not null;
      end if;
    end if;

    if old_path is not null then
      update asana_image_private.reservations set unreferenced_since = clock_timestamp()
      where object_path = old_path and state = 'confirmed'
        and not exists (
          select 1 from public.asanas
          where private_image_path = old_path and id <> old.id
        );
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function asana_image_private.track_asana_image_reference()
from public, anon, authenticated, service_role;

-- Run before check_asana_private_image so object validation follows the lock.
create trigger asana_image_reference_tracking
before insert or update of private_image_path or delete on public.asanas
for each row execute function asana_image_private.track_asana_image_reference();

commit;
