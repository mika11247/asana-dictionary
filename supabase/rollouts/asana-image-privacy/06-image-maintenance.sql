begin;
set local lock_timeout = '5s';

alter table asana_image_private.reservations add column reclaim_started_at timestamptz
  check (reclaim_started_at is null or state in ('confirmed', 'released'));

create function asana_image_private.guard_image_reclaim() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.private_image_path is null then return new; end if;
  if tg_op = 'UPDATE' and new.private_image_path is not distinct from old.private_image_path then
    return new;
  end if;
  -- This trigger sorts after Stage B's reference tracker, which takes the shared lock.
  if exists (select 1 from asana_image_private.reservations
    where object_path = new.private_image_path and reclaim_started_at is not null) then
    raise exception using errcode = '23514', message = 'Private image is unavailable';
  end if;
  return new;
end;
$$;
revoke all on function asana_image_private.guard_image_reclaim()
from public, anon, authenticated, service_role;
create trigger asana_image_reference_tracking_guard
before insert or update of private_image_path on public.asanas
for each row execute function asana_image_private.guard_image_reclaim();

create function public.asana_image_maintenance(p_action text, p_request uuid default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  cfg asana_image_private.settings%rowtype;
  r asana_image_private.reservations%rowtype;
  object_present boolean;
  object_bytes bigint;
  object_valid boolean;
  at_time timestamptz;
  removed_count integer;
  report jsonb;
begin
  if p_action = 'inspect' then
    -- No row locks or writes. Candidate IDs are internal to the operator client.
    with inventory as (
      select ledger.*, o.name is not null as present,
        case when o.metadata->>'size' ~ '^[0-9]{1,15}$'
          then (o.metadata->>'size')::bigint end as stored_bytes,
        (o.name is not null and (o.owner_id is null or o.owner_id = ledger.owner_id::text)
          and o.metadata->>'mimetype' = 'image/webp'
          and case when o.metadata->>'size' ~ '^[0-9]{1,15}$'
            then (o.metadata->>'size')::bigint end between 1 and ledger.reserved_bytes) as valid,
        exists(select 1 from public.asanas a where a.private_image_path = ledger.object_path) as referenced,
        s.orphan_grace
      from asana_image_private.reservations ledger cross join asana_image_private.settings s
      left join storage.objects o on o.bucket_id = 'asana-images-private' and o.name = ledger.object_path
      where ledger.state <> 'released'
    ), reclaim as (
      select * from inventory where state = 'confirmed' and not referenced
        and coalesce(unreferenced_since, updated_at) <= now() - orphan_grace
        and ((valid and stored_bytes = actual_bytes)
          or (not present and reclaim_started_at is not null))
    ), recoverable as (
      select * from inventory where not referenced and (
        (state = 'held' and expires_at <= now() and not present)
        or (state in ('writing', 'uncertain') and valid))
    )
    select jsonb_build_object(
      'reclaim_count', (select count(*) from reclaim),
      'reclaim_bytes', (select coalesce(sum(actual_bytes) filter (where present), 0) from reclaim),
      'reclaim_ids', (select coalesce(jsonb_agg(request_id), '[]'::jsonb) from
        (select request_id from reclaim order by reclaim_started_at nulls last, updated_at, request_id limit 10) batch),
      'recoverable_count', (select count(*) from recoverable),
      'recovery_ids', (select coalesce(jsonb_agg(request_id), '[]'::jsonb) from
        (select request_id from recoverable order by updated_at, request_id limit 10) batch),
      'pending_review_count', (select count(*) from inventory where state in ('held','writing','uncertain'))
        - (select count(*) from recoverable),
      'reclaim_review_count', (select count(*) from inventory where reclaim_started_at is not null)
        - (select count(*) from reclaim where reclaim_started_at is not null),
      'old_attempt_count', (select count(*) from asana_image_private.attempts
        where attempted_at < now() - interval '7 days')
    ) into report;
    return report;
  end if;

  select * into strict cfg from asana_image_private.settings where singleton for update;
  at_time := clock_timestamp();
  if p_action = 'prune' then
    delete from asana_image_private.attempts where attempted_at < at_time - interval '7 days';
    get diagnostics removed_count = row_count;
    return jsonb_build_object('status', 'pruned', 'count', removed_count);
  end if;
  if p_action is null or p_action not in ('claim', 'finish', 'recovery_probe', 'recover') or p_request is null then
    raise exception 'Invalid image maintenance operation';
  end if;
  select * into r from asana_image_private.reservations where request_id = p_request;
  if not found or r.object_path <> r.owner_id::text || '/' || r.request_id::text || '.webp' then
    return jsonb_build_object('status', 'skipped');
  end if;
  if r.state = 'released' then return jsonb_build_object('status', 'released'); end if;
  if exists (select 1 from public.asanas where private_image_path = r.object_path) then
    return jsonb_build_object('status', 'protected');
  end if;

  select case when o.metadata->>'size' ~ '^[0-9]{1,15}$' then (o.metadata->>'size')::bigint end,
    (o.owner_id is null or o.owner_id = r.owner_id::text) and o.metadata->>'mimetype' = 'image/webp'
    into object_bytes, object_valid
  from storage.objects o where o.bucket_id = 'asana-images-private' and o.name = r.object_path;
  object_present := found;
  object_valid := coalesce(object_valid and object_bytes between 1 and r.reserved_bytes, false);

  if p_action in ('claim', 'finish') then
    if r.state <> 'confirmed' or coalesce(r.unreferenced_since, r.updated_at) > at_time - cfg.orphan_grace then
      return jsonb_build_object('status', 'protected');
    end if;
    if p_action = 'claim' then
      if (object_present and (not object_valid or object_bytes <> r.actual_bytes))
        or (not object_present and r.reclaim_started_at is null) then
        return jsonb_build_object('status', 'needs_review');
      end if;
      update asana_image_private.reservations set reclaim_started_at = at_time
        where request_id = p_request and reclaim_started_at is null;
      return jsonb_build_object('status', 'claimed', 'path', r.object_path);
    end if;
    if r.reclaim_started_at is null or object_present then
      return jsonb_build_object('status', 'needs_review');
    end if;
    update asana_image_private.reservations set state = 'released', actual_bytes = null, updated_at = at_time
      where request_id = p_request;
    return jsonb_build_object('status', 'released');
  end if;

  if r.state = 'confirmed' then return jsonb_build_object('status', 'confirmed'); end if;
  -- An expired held reservation cannot start once the shared lock is released.
  if r.state = 'held' and not object_present and r.expires_at <= at_time then
    if p_action = 'recovery_probe' then return jsonb_build_object('status', 'expired_held'); end if;
    return jsonb_build_object('status', public.asana_image_settle(r.owner_id, r.request_id, r.object_path, 'release'));
  end if;
  if r.state in ('writing', 'uncertain') and object_valid then
    if p_action = 'recovery_probe' then
      return jsonb_build_object('status', 'verify_object', 'path', r.object_path, 'bytes', object_bytes);
    end if;
    return jsonb_build_object('status', public.asana_image_settle(r.owner_id, r.request_id, r.object_path, 'confirm'));
  end if;
  return jsonb_build_object('status', 'needs_review');
end;
$$;
revoke all on function public.asana_image_maintenance(text, uuid) from public, anon, authenticated, service_role;
grant execute on function public.asana_image_maintenance(text, uuid) to service_role;

commit;
