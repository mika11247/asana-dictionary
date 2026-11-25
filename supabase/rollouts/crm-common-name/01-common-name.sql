begin;

-- Existing rows already satisfy this constraint. Keep formal-only legacy rows editable.
alter table public.crm_customers drop constraint crm_customers_name_not_blank;
alter table public.crm_customers add constraint crm_customers_name_not_blank check (
  nullif(btrim(nickname),'') is not null or nullif(btrim(name),'') is not null
);

create function crm_private.crm_require_customer_display_name()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if nullif(btrim(new.nickname),'') is null then
    if tg_op='INSERT' then
      raise check_violation using message='Customer display name required';
    end if;
    if nullif(btrim(old.nickname),'') is not null then
      raise check_violation using message='Registered customer display name cannot be removed';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function crm_private.crm_require_customer_display_name() from public, anon, authenticated, service_role;
create trigger crm_require_customer_display_name before insert or update of nickname
on public.crm_customers for each row execute function crm_private.crm_require_customer_display_name();

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
  insert into public.crm_customer_services(customer_id,location_id,service_id,membership_type)
  select saved_id,item.location_id,item.service_id,item.membership_type
  from pg_catalog.jsonb_to_recordset(relations) as item(location_id bigint,service_id bigint,membership_type text);
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

    delete from public.crm_customer_services s where s.customer_id=saved_id and s.location_id<>1 and not exists (
      select 1 from pg_catalog.jsonb_to_recordset(relations) as r(location_id bigint,service_id bigint)
      where r.location_id=s.location_id and r.service_id=s.service_id
    );
    insert into public.crm_customer_services as s (customer_id,location_id,service_id,membership_type)
    select saved_id, location_id, service_id, membership_type
    from pg_catalog.jsonb_to_recordset(relations) as r(location_id bigint,service_id bigint,membership_type text)
    on conflict (customer_id,location_id,service_id) do update set membership_type=excluded.membership_type
    where s.location_id<>1 and s.membership_type is distinct from excluded.membership_type;
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
create or replace function public.crm_save_lilly_profile(target_customer_id bigint, membership_code text, selected_services text[], nickname_value text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_crm_admin() then raise insufficient_privilege; end if;
  -- Lock in the same order as the shared save.
  perform 1 from public.crm_customers where id=target_customer_id for update;
  if not found then raise no_data_found; end if;
  perform 1 from public.crm_customer_groups
    where customer_id=target_customer_id and group_code='lilly' and archived_at is null for update;
  if not found then raise check_violation using message='Active Lilly membership required'; end if;
  insert into public.crm_lilly_profiles(customer_id,membership,service_codes)
  values(target_customer_id,membership_code,selected_services)
  on conflict(customer_id) do update set membership=excluded.membership,service_codes=excluded.service_codes;
  return target_customer_id;
end;
$$;

commit;
