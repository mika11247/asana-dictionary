begin;
set local lock_timeout = '5s';
create schema asana_image_private;
revoke all on schema asana_image_private from public, anon, authenticated, service_role;

create table asana_image_private.settings (
  singleton boolean primary key default true check (singleton),
  request_bytes integer not null default 4194304 check (request_bytes between 1 and 4194304),
  object_bytes integer not null default 5242880 check (object_bytes between request_bytes and 5242880),
  minute_limit integer not null default 6 check (minute_limit > 0),
  day_limit integer not null default 40 check (day_limit >= minute_limit),
  in_flight_limit integer not null default 2 check (in_flight_limit between 1 and minute_limit),
  free_bytes bigint not null default 41943040 check (free_bytes > 0),
  support_bytes bigint not null default 62914560 check (support_bytes >= free_bytes),
  special_bytes bigint not null default 125829120 check (special_bytes >= support_bytes),
  pro_bytes bigint not null default 314572800 check (pro_bytes >= special_bytes),
  warning_bytes bigint not null default 629145600 check (warning_bytes > 0),
  project_bytes bigint not null default 734003200 check (project_bytes >= warning_bytes),
  migration_bytes bigint not null default 73400320 check (migration_bytes between 0 and project_bytes - object_bytes),
  start_window interval not null default interval '10 minutes' check (start_window > interval '0'),
  orphan_grace interval not null default interval '24 hours' check (orphan_grace >= interval '24 hours')
);
insert into asana_image_private.settings default values;

create table asana_image_private.reservations (
  request_id uuid primary key,
  owner_id uuid not null,
  object_path text not null unique,
  state text not null check (state in ('held','writing','uncertain','confirmed','released')),
  reserved_bytes integer not null check (reserved_bytes between 1 and 5242880),
  actual_bytes integer check (actual_bytes between 1 and reserved_bytes),
  created_at timestamptz not null,
  expires_at timestamptz not null check (expires_at > created_at),
  updated_at timestamptz not null,
  check (object_path = owner_id::text || '/' || request_id::text || '.webp'),
  check ((state = 'confirmed') = (actual_bytes is not null))
);
create index upload_reservations_active_owner on asana_image_private.reservations (owner_id)
where state in ('held','writing','uncertain');

-- Only attempts that acquired a reservation enter the rate window.
create table asana_image_private.attempts (
  request_id uuid primary key references asana_image_private.reservations,
  owner_id uuid not null,
  attempted_at timestamptz not null
);
create index upload_attempts_owner_time on asana_image_private.attempts (owner_id, attempted_at);
alter table asana_image_private.settings enable row level security;
alter table asana_image_private.reservations enable row level security;
alter table asana_image_private.attempts enable row level security;
revoke all on all tables in schema asana_image_private from public, anon, authenticated, service_role;

-- Storage sizes are read from server-maintained object metadata, including legacy
-- and unreferenced files. Active reservation bytes are deliberately additive.
create function asana_image_private.usage_totals(p_owner uuid)
returns table (project_objects bigint, user_objects bigint, project_reserved bigint,
               user_reserved bigint, user_in_flight bigint, invalid_sizes bigint,
               mismatched_confirmed bigint)
language sql set search_path = ''
as $$
  with objects as (
    select bucket_id, name, case when metadata->>'size' ~ '^[0-9]{1,15}$'
      then (metadata->>'size')::bigint end as bytes
    from storage.objects
  ), actual as (
    select coalesce(sum(bytes),0)::bigint as total,
      coalesce(sum(bytes) filter (where bucket_id = 'asana-images-private'
        and split_part(name,'/',1) = p_owner::text),0)::bigint as owned,
      count(*) filter (where bytes is null) as invalid
    from objects
  ), pending as (
    select coalesce(sum(reserved_bytes),0)::bigint as total,
      coalesce(sum(reserved_bytes) filter (where owner_id = p_owner),0)::bigint as owned,
      count(*) filter (where owner_id = p_owner) as in_flight
    from asana_image_private.reservations where state in ('held','writing','uncertain')
  )
  select actual.total, actual.owned, pending.total, pending.owned, pending.in_flight, actual.invalid,
    (select count(*) from asana_image_private.reservations r left join objects o
      on o.bucket_id = 'asana-images-private' and o.name = r.object_path
      where r.state = 'confirmed' and o.bytes is distinct from r.actual_bytes)
  from actual cross join pending;
$$;
revoke all on function asana_image_private.usage_totals(uuid) from public, anon, authenticated, service_role;

-- Only a trusted server that already verified Auth may pass p_owner. There is
-- no caller-supplied plan, size estimate, path, or timestamp.
create function public.asana_image_reserve(p_owner uuid, p_request uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  cfg asana_image_private.settings%rowtype;
  prior asana_image_private.reservations%rowtype;
  usage record;
  plan_name text;
  user_limit bigint;
  minute_count bigint;
  day_count bigint;
  at_time timestamptz;
  target_path text;
begin
  if p_owner is null or p_request is null then raise exception 'Invalid reservation input'; end if;
  select * into strict cfg from asana_image_private.settings where singleton for update;
  at_time := clock_timestamp();
  select * into prior from asana_image_private.reservations where request_id = p_request;
  if found then
    if prior.owner_id <> p_owner then raise exception 'Reservation unavailable'; end if;
    return jsonb_build_object('status',prior.state,'path',prior.object_path,'replayed',true);
  end if;
  select p.plan::text into plan_name from public.profiles p
    where p.id = p_owner and p.status = 'active' and p.deleted_at is null;
  if not found then return jsonb_build_object('status','account_unavailable'); end if;
  user_limit := case plan_name when 'free' then cfg.free_bytes when 'support' then cfg.support_bytes
    when 'special' then cfg.special_bytes when 'pro' then cfg.pro_bytes end;
  if user_limit is null then return jsonb_build_object('status','account_unavailable'); end if;

  select count(*) filter (where attempted_at > at_time - interval '60 seconds'), count(*)
    into minute_count, day_count from asana_image_private.attempts
    where owner_id = p_owner and attempted_at > at_time - interval '24 hours';
  if minute_count >= cfg.minute_limit then return jsonb_build_object('status','rate_minute'); end if;
  if day_count >= cfg.day_limit then return jsonb_build_object('status','rate_day'); end if;

  select * into usage from asana_image_private.usage_totals(p_owner);
  if usage.invalid_sizes > 0 or usage.mismatched_confirmed > 0 then
    return jsonb_build_object('status','reconciliation_required');
  end if;
  if usage.user_in_flight >= cfg.in_flight_limit then return jsonb_build_object('status','in_flight'); end if;
  if usage.user_objects + usage.user_reserved + cfg.object_bytes > user_limit then
    return jsonb_build_object('status','user_capacity');
  end if;
  if usage.project_objects + usage.project_reserved + cfg.object_bytes > cfg.project_bytes - cfg.migration_bytes then
    return jsonb_build_object('status','project_capacity');
  end if;

  target_path := p_owner::text || '/' || p_request::text || '.webp';
  if exists (select 1 from storage.objects where bucket_id='asana-images-private' and name=target_path) then
    raise exception 'Reservation unavailable';
  end if;
  insert into asana_image_private.reservations
    (request_id,owner_id,object_path,state,reserved_bytes,created_at,expires_at,updated_at)
    values (p_request,p_owner,target_path,'held',cfg.object_bytes,at_time,at_time + cfg.start_window,at_time);
  insert into asana_image_private.attempts values (p_request,p_owner,at_time);
  return jsonb_build_object('status','held','path',target_path,'request_bytes',cfg.request_bytes,
    'warning', usage.project_objects + usage.project_reserved + cfg.object_bytes >= cfg.warning_bytes);
end;
$$;

create function public.asana_image_settle(p_owner uuid, p_request uuid, p_path text, p_action text)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  r asana_image_private.reservations%rowtype;
  object_size bigint;
  object_mime text;
  object_exists boolean;
  at_time timestamptz;
  next_state text;
begin
  if p_action is null or p_action not in ('start','confirm','release','failed','uncertain') then
    raise exception 'Invalid reservation action';
  end if;
  -- All writes take the same global row lock first.
  perform 1 from asana_image_private.settings where singleton for update;
  if not found then raise exception 'Reservation settings unavailable'; end if;
  at_time := clock_timestamp();
  select * into r from asana_image_private.reservations where request_id = p_request;
  if not found or r.owner_id is distinct from p_owner or r.object_path is distinct from p_path then
    raise exception 'Reservation unavailable';
  end if;
  if (p_action,r.state) in (('confirm','confirmed'),('release','released'),('failed','released'),('uncertain','uncertain')) then
    return r.state;
  end if;
  select case when o.metadata->>'size' ~ '^[0-9]{1,15}$' then (o.metadata->>'size')::bigint end,
    o.metadata->>'mimetype' into object_size,object_mime
    from storage.objects o where o.bucket_id = 'asana-images-private' and o.name = r.object_path;
  object_exists := found;
  if p_action = 'start' and r.state = 'held' and r.expires_at > at_time and not object_exists then
    next_state := 'writing';
  elsif p_action = 'confirm' and r.state in ('writing','uncertain') and object_exists
        and object_size between 1 and r.reserved_bytes and object_mime = 'image/webp' then
    next_state := 'confirmed';
  elsif p_action = 'release' and r.state = 'held' and not object_exists then
    next_state := 'released';
  -- Only use after a definitive no-write rejection, never after a timeout.
  elsif p_action = 'failed' and r.state = 'writing' and not object_exists then
    next_state := 'released';
  elsif p_action = 'uncertain' and r.state = 'writing' then
    next_state := 'uncertain';
  else
    raise exception 'Unsafe reservation transition';
  end if;
  update asana_image_private.reservations set state = next_state,
    actual_bytes = case when next_state = 'confirmed' then object_size::integer end, updated_at = at_time
    where request_id = r.request_id;
  return next_state;
end;
$$;

revoke all on function public.asana_image_reserve(uuid,uuid),
  public.asana_image_settle(uuid,uuid,text,text) from public, anon, authenticated, service_role;
grant execute on function public.asana_image_reserve(uuid,uuid),
  public.asana_image_settle(uuid,uuid,text,text) to service_role;
commit;
