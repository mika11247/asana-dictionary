begin;

create table public.crm_groups (
  code text primary key,
  name text not null,
  sort_order integer not null unique
);
insert into public.crm_groups values ('mglitter','M.glitter',10),('nus','NUS',20),('lilly','Lilly',30);

create table public.crm_customer_groups (
  customer_id bigint not null references public.crm_customers(id),
  group_code text not null references public.crm_groups(code),
  archived_at timestamptz,
  primary key (customer_id, group_code)
);

-- Explicit brand membership is separate from legacy service-derived business rows.
create table public.crm_customer_group_brands (
  customer_id bigint not null references public.crm_customers(id),
  group_code text not null default 'mglitter' check (group_code = 'mglitter'),
  business_code text not null check (business_code in ('third_place','moments','overture','sunrise','unite','fifth_vibes','om_radiance')),
  archived_at timestamptz,
  primary key (customer_id, business_code),
  foreign key (customer_id, group_code) references public.crm_customer_groups(customer_id, group_code),
  foreign key (customer_id, business_code) references public.crm_customer_businesses(customer_id, business_code)
);

do $$
declare relation_name text;
begin
  foreach relation_name in array array['crm_groups','crm_customer_groups','crm_customer_group_brands'] loop
    execute format('alter table public.%I enable row level security', relation_name);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', relation_name);
    execute format('grant select on public.%I to authenticated', relation_name);
    execute format('create policy crm_owner_read on public.%I for select to authenticated using ((select public.is_crm_admin()))', relation_name);
  end loop;
end;
$$;

-- Earlier NUS actions and clients still write the existing business row.
create function crm_private.crm_sync_nus_group()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.crm_customer_groups as membership (customer_id, group_code, archived_at)
  values (new.customer_id, 'nus', new.archived_at)
  on conflict (customer_id, group_code) do update set archived_at=excluded.archived_at
  where membership.archived_at is distinct from excluded.archived_at;
  return new;
end;
$$;
revoke all on function crm_private.crm_sync_nus_group() from public, anon, authenticated, service_role;
create trigger crm_sync_nus_group after insert or update of archived_at on public.crm_customer_businesses
for each row when (new.business_code = 'nus') execute function crm_private.crm_sync_nus_group();

-- Keep earlier service links; new Lilly assignments never imply an M.glitter business.
create or replace function crm_private.crm_link_service_business()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  insert into public.crm_customer_businesses (customer_id, business_code, source)
  select new.customer_id, business_code, 'service'
  from public.crm_services where id = new.service_id and business_code <> 'nus' and new.location_id <> 1
  on conflict (customer_id, business_code) do nothing;
  return new;
end;
$$;

create or replace trigger crm_link_service_business
after insert or update of customer_id, service_id, location_id on public.crm_customer_services
for each row execute function crm_private.crm_link_service_business();

create function public.crm_save_customer_memberships(
  target_customer_id bigint, customer jsonb, relations jsonb, selected_groups text[], selected_brands text[]
)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  saved_id bigint := target_customer_id;
begin
  if not public.is_crm_admin() then raise insufficient_privilege; end if;
  if selected_groups is null or selected_brands is null
    or array_position(selected_groups, null) is not null or array_position(selected_brands, null) is not null
    or not selected_groups <@ array['mglitter','nus','lilly']::text[]
    or not selected_brands <@ array['third_place','moments','overture','sunrise','unite','fifth_vibes','om_radiance']::text[]
    or (cardinality(selected_brands) > 0 and not ('mglitter'=any(selected_groups)))
    or pg_catalog.jsonb_typeof(relations) is distinct from 'array'
    or nullif(btrim(customer->>'name'),'') is null then
    raise check_violation using message='Invalid customer membership input';
  end if;

  if saved_id is null then
    saved_id := public.crm_create_customer(customer, relations);
  else
    update public.crm_customers set
      name=btrim(customer->>'name'), nickname=customer->>'nickname', name_yomi=customer->>'name_yomi',
      photo_permission=coalesce(customer->>'photo_permission','unknown'),
      customer_request=customer->>'customer_request', care_notes=customer->>'care_notes', private_note=customer->>'private_note'
    where id=saved_id;
    if not found then raise no_data_found; end if;

    delete from public.crm_customer_services s where s.customer_id=saved_id and not exists (
      select 1 from pg_catalog.jsonb_to_recordset(relations) as r(location_id bigint,service_id bigint)
      where r.location_id=s.location_id and r.service_id=s.service_id
    );
    insert into public.crm_customer_services as s (customer_id,location_id,service_id,membership_type)
    select saved_id, location_id, service_id, membership_type
    from pg_catalog.jsonb_to_recordset(relations) as r(location_id bigint,service_id bigint,membership_type text)
    on conflict (customer_id,location_id,service_id) do update set membership_type=excluded.membership_type
    where s.membership_type is distinct from excluded.membership_type;
  end if;

  insert into public.crm_customer_groups as membership (customer_id,group_code)
  select distinct saved_id, code from unnest(selected_groups) code where code<>'nus'
  on conflict (customer_id,group_code) do update set archived_at=null where membership.archived_at is not null;

  if 'nus'=any(selected_groups) then
    insert into public.crm_customer_businesses as business (customer_id,business_code) values(saved_id,'nus')
    on conflict (customer_id,business_code) do update set archived_at=null where business.archived_at is not null;
    insert into public.crm_customer_groups (customer_id,group_code) values(saved_id,'nus') on conflict do nothing;
  else
    update public.crm_customer_businesses set archived_at=now()
    where customer_id=saved_id and business_code='nus' and archived_at is null;
  end if;

  insert into public.crm_customer_businesses (customer_id,business_code)
  select distinct saved_id, code from unnest(selected_brands) code
  on conflict (customer_id,business_code) do nothing;
  insert into public.crm_customer_group_brands as brand (customer_id,business_code)
  select distinct saved_id, code from unnest(selected_brands) code
  on conflict (customer_id,business_code) do update set archived_at=null where brand.archived_at is not null;

  update public.crm_customer_group_brands set archived_at=now()
  where customer_id=saved_id and archived_at is null and not (business_code=any(selected_brands));
  update public.crm_customer_groups set archived_at=now()
  where customer_id=saved_id and archived_at is null and not (group_code=any(selected_groups));
  return saved_id;
end;
$$;
revoke all on function public.crm_save_customer_memberships(bigint,jsonb,jsonb,text[],text[]) from public, anon, authenticated, service_role;
grant execute on function public.crm_save_customer_memberships(bigint,jsonb,jsonb,text[],text[]) to authenticated;

commit;
