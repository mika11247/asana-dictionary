begin;

-- A Lilly-only customer can have a nickname and no formal name.
alter table public.crm_customers alter column name drop not null;
alter table public.crm_customers drop constraint crm_customers_name_not_blank;
alter table public.crm_customers add constraint crm_customers_name_not_blank
check (case when name is null then nullif(btrim(nickname),'') is not null else length(btrim(name)) > 0 end);

create table public.crm_lilly_profiles (
  customer_id bigint primary key references public.crm_customers(id),
  group_code text not null default 'lilly' check (group_code='lilly'),
  membership text not null check (membership in ('trial','ticket','monthly','unknown')),
  service_codes text[] not null default '{}',
  foreign key (customer_id, group_code) references public.crm_customer_groups(customer_id, group_code),
  check (array_position(service_codes,null) is null and service_codes <@ array['yoga','mat','machine']::text[]
    and cardinality(service_codes) = (case when 'yoga'=any(service_codes) then 1 else 0 end
      + case when 'mat'=any(service_codes) then 1 else 0 end
      + case when 'machine'=any(service_codes) then 1 else 0 end))
);
alter table public.crm_lilly_profiles enable row level security;
revoke all on public.crm_lilly_profiles from public, anon, authenticated, service_role;
grant select on public.crm_lilly_profiles to authenticated;
create policy crm_owner_read on public.crm_lilly_profiles for select to authenticated using ((select public.is_crm_admin()));

create or replace function public.crm_create_customer(customer jsonb, relations jsonb)
returns bigint
language plpgsql security invoker set search_path = ''
as $$
declare saved_id bigint;
begin
  if not public.is_crm_admin() then raise insufficient_privilege; end if;
  if nullif(btrim(customer->>'name'),'') is null then raise check_violation using message='Customer name required'; end if;
  insert into public.crm_customers(name,nickname,name_yomi,photo_permission,customer_request,care_notes,private_note)
  values(customer->>'name',customer->>'nickname',customer->>'name_yomi',
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
    or (nullif(btrim(customer->>'name'),'') is null and (selected_groups <> array['lilly']::text[] or nullif(btrim(customer->>'nickname'),'') is null)) then
    raise check_violation using message='Invalid customer membership input';
  end if;

  if saved_id is null then
    if nullif(btrim(customer->>'name'),'') is null then
      insert into public.crm_customers(name,nickname,photo_permission,customer_request,care_notes,private_note)
      values(null,btrim(customer->>'nickname'),coalesce(customer->>'photo_permission','unknown'),customer->>'customer_request',customer->>'care_notes',customer->>'private_note') returning id into saved_id;
      insert into public.crm_customer_services(customer_id,location_id,service_id,membership_type)
      select saved_id,location_id,service_id,membership_type from pg_catalog.jsonb_to_recordset(relations) as r(location_id bigint,service_id bigint,membership_type text);
    else
      saved_id := public.crm_create_customer(customer, relations);
    end if;
  else
    update public.crm_customers set
      name=nullif(btrim(customer->>'name'),''), nickname=customer->>'nickname', name_yomi=customer->>'name_yomi',
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
create function public.crm_save_lilly_profile(target_customer_id bigint, membership_code text, selected_services text[], nickname_value text)
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
  update public.crm_customers set nickname=nullif(btrim(nickname_value),'') where id=target_customer_id;
  insert into public.crm_lilly_profiles(customer_id,membership,service_codes)
  values(target_customer_id,membership_code,selected_services)
  on conflict(customer_id) do update set membership=excluded.membership,service_codes=excluded.service_codes;
  return target_customer_id;
end;
$$;
revoke all on function public.crm_save_lilly_profile(bigint,text,text[],text) from public, anon, authenticated, service_role;
grant execute on function public.crm_save_lilly_profile(bigint,text,text[],text) to authenticated;

create function public.crm_create_customer_with_lilly(customer jsonb, relations jsonb, selected_groups text[], selected_brands text[], membership_code text, selected_services text[])
returns bigint
language plpgsql security invoker set search_path = ''
as $$
declare saved_id bigint;
begin
  if not public.is_crm_admin() then raise insufficient_privilege; end if;
  saved_id := public.crm_save_customer_memberships(null,customer,relations,selected_groups,selected_brands);
  return public.crm_save_lilly_profile(saved_id,membership_code,selected_services,customer->>'nickname');
end;
$$;
revoke all on function public.crm_create_customer_with_lilly(jsonb,jsonb,text[],text[],text,text[]) from public, anon, authenticated, service_role;
grant execute on function public.crm_create_customer_with_lilly(jsonb,jsonb,text[],text[],text,text[]) to authenticated;

commit;
