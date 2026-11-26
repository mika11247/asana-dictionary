begin;

alter table public.crm_records
  add column record_group_code text references public.crm_groups(code),
  add column record_brand_code text references public.crm_businesses(code),
  add column location_label text check (location_label is null or length(btrim(location_label)) between 1 and 200),
  add column service_label text check (service_label is null or length(btrim(service_label)) between 1 and 200),
  alter column location_id drop not null,
  alter column service_id drop not null;

-- Old records can still be read before their labels are populated.
alter table public.crm_records add constraint crm_record_context check (
  (record_group_code is null and record_brand_code is null and location_id is not null and service_id is not null)
  or (record_group_code is not null and service_label is not null and case record_group_code
    when 'mglitter' then coalesce(record_brand_code in ('third_place','moments','overture','sunrise','unite','fifth_vibes','om_radiance'),false)
    when 'lilly' then record_brand_code is null and service_label in ('ヨガ','マットピラティス','マシンピラティス')
    when 'nus' then record_brand_code is null
    else false end)
);

create function crm_private.crm_validate_record_context()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_crm_admin() then raise insufficient_privilege; end if;
  if tg_op='UPDATE' then
    if (new.customer_id,new.location_id,new.service_id) is distinct from (old.customer_id,old.location_id,old.service_id) then
      raise check_violation using message='Historical record references cannot be changed';
    end if;
    if (new.record_group_code,new.record_brand_code,new.location_label,new.service_label) is not distinct from
       (old.record_group_code,old.record_brand_code,old.location_label,old.service_label) then return new; end if;
    if old.location_id is not null or old.service_id is not null then
      raise check_violation using message='Migrated record context cannot be changed';
    end if;
  elsif new.location_id is not null or new.service_id is not null then
    raise check_violation using message='New records use explicit group context';
  end if;
  perform 1 from public.crm_customer_groups g where g.customer_id=new.customer_id
    and g.group_code=new.record_group_code and g.archived_at is null for share;
  if not found then
    raise check_violation using message='Active customer affiliation required';
  end if;
  return new;
end;
$$;
revoke all on function crm_private.crm_validate_record_context() from public, anon, authenticated, service_role;
create trigger crm_validate_record_context before insert or update on public.crm_records
for each row execute function crm_private.crm_validate_record_context();

-- Keep old RPC signatures for callers during the cutover. Old service rows are historical.
revoke insert, update, delete, truncate, trigger, references on
  public.crm_customer_services, public.crm_locations, public.crm_services from public, anon, authenticated, service_role;

create or replace function public.crm_create_customer(customer jsonb, relations jsonb)
returns bigint
language plpgsql security invoker set search_path = ''
as $$
declare saved_id bigint;
begin
  if not public.is_crm_admin() then raise insufficient_privilege; end if;
  if nullif(btrim(customer->>'nickname'),'') is null then raise check_violation using message='Customer display name required'; end if;
  insert into public.crm_customers(name,nickname,name_yomi,photo_permission,customer_request,care_notes,private_note)
  values(nullif(btrim(customer->>'name'),''),btrim(customer->>'nickname'),nullif(btrim(customer->>'name_yomi'),''),
    coalesce(customer->>'photo_permission','unknown'),customer->>'customer_request',customer->>'care_notes',customer->>'private_note')
  returning id into saved_id;
  return saved_id;
end;
$$;

create or replace function public.crm_save_customer_memberships(
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
    or (saved_id is null and nullif(btrim(customer->>'nickname'),'') is null) then
    raise check_violation using message='Invalid customer membership input';
  end if;

  if saved_id is null then
    saved_id := public.crm_create_customer(customer, relations);
  else
    update public.crm_customers set
      name=case when customer ? 'name' then nullif(btrim(customer->>'name'),'') else name end,
      nickname=case when customer ? 'nickname' then nullif(btrim(customer->>'nickname'),'') else nickname end,
      name_yomi=case when customer ? 'name_yomi' then nullif(btrim(customer->>'name_yomi'),'') else name_yomi end,
      photo_permission=coalesce(customer->>'photo_permission','unknown'),
      customer_request=customer->>'customer_request', care_notes=customer->>'care_notes', private_note=customer->>'private_note'
    where id=saved_id;
    if not found then raise no_data_found; end if;

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
commit;
