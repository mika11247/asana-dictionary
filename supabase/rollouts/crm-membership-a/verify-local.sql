\set ON_ERROR_STOP on
\ir ../crm-step-2b/verify-local.sql
create temporary table membership_baseline as
select (select jsonb_agg(to_jsonb(c) order by id) from public.crm_customers c) customers,
  (select jsonb_agg(to_jsonb(s) order by id) from public.crm_customer_services s) services,
  (select jsonb_agg(to_jsonb(r) order by id) from public.crm_records r) records,
  (select jsonb_agg(to_jsonb(b) order by customer_id,business_code) from public.crm_customer_businesses b) businesses;
\ir 01-memberships.sql

do $$
begin
  if (select count(*) from public.crm_groups) <> 3
    or exists(select 1 from public.crm_customer_groups)
    or exists(select 1 from public.crm_customer_group_brands)
    or exists(select 1 from membership_baseline x where
      x.customers is distinct from (select jsonb_agg(to_jsonb(c) order by id) from public.crm_customers c)
      or x.services is distinct from (select jsonb_agg(to_jsonb(s) order by id) from public.crm_customer_services s)
      or x.records is distinct from (select jsonb_agg(to_jsonb(r) order by id) from public.crm_records r)
      or x.businesses is distinct from (select jsonb_agg(to_jsonb(b) order by customer_id,business_code) from public.crm_customer_businesses b)) then
    raise exception 'Migration changed legacy data or classified customers';
  end if;
  if has_table_privilege('authenticated','public.crm_customer_groups','INSERT, UPDATE, DELETE, TRUNCATE')
    or has_table_privilege('anon','public.crm_customer_group_brands','SELECT')
    or has_function_privilege('anon','public.crm_save_customer_memberships(bigint,jsonb,jsonb,text[],text[])','EXECUTE') then
    raise exception 'Unexpected membership privilege';
  end if;
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
do $$
declare customer_id_created bigint; service_id_before bigint;
begin
  customer_id_created := public.crm_save_customer_memberships(null,'{"name":"Stage A fixture"}',
    '[{"location_id":1,"service_id":1}]',array['mglitter','nus','lilly'],array['moments','unite']);
  if (select count(*) from public.crm_customer_groups where customer_id=customer_id_created and archived_at is null)<>3
    or (select count(*) from public.crm_customer_group_brands where customer_id=customer_id_created and archived_at is null)<>2
    or not exists(select 1 from public.crm_customer_businesses where customer_id=customer_id_created and business_code='nus')
    or exists(select 1 from public.crm_customer_businesses where customer_id=customer_id_created and business_code='third_place') then
    raise exception 'Incorrect multi-membership or Lilly classification';
  end if;
  select id into strict service_id_before from public.crm_customer_services where customer_id=customer_id_created;
  begin
    perform public.crm_save_customer_memberships(customer_id_created,'{"name":"Failed edit"}',
      '[{"location_id":1,"service_id":999}]',array['lilly'],array[]::text[]);
    raise exception 'Invalid service accepted';
  exception when foreign_key_violation then null;
  end;
  if not exists(select 1 from public.crm_customers where id=customer_id_created and name='Stage A fixture')
    or not exists(select 1 from public.crm_customer_services where id=service_id_before) then
    raise exception 'Atomic rollback failed';
  end if;
  perform public.crm_save_customer_memberships(customer_id_created,'{"name":"Stage A edited"}',
    '[{"location_id":1,"service_id":1,"membership_type":"回数券"}]',array['lilly'],array[]::text[]);
  if not exists(select 1 from public.crm_customer_services where id=service_id_before and membership_type='回数券')
    or (select count(*) from public.crm_customer_groups where customer_id=customer_id_created and archived_at is not null)<>2
    or (select count(*) from public.crm_customer_group_brands where customer_id=customer_id_created and archived_at is not null)<>2
    or not exists(select 1 from public.crm_customer_businesses where customer_id=customer_id_created and business_code='nus' and archived_at is not null) then
    raise exception 'Archive or existing service ID not preserved';
  end if;
  perform public.crm_save_customer_memberships(customer_id_created,'{"name":"Stage A edited"}',
    '[{"location_id":1,"service_id":1,"membership_type":"回数券"}]',array['mglitter','nus','lilly'],array['moments']);
  if not exists(select 1 from public.crm_customer_group_brands where customer_id=customer_id_created and business_code='moments' and archived_at is null)
    or not exists(select 1 from public.crm_customer_businesses where customer_id=customer_id_created and business_code='nus' and archived_at is null) then
    raise exception 'Re-selection did not restore membership';
  end if;
end;
$$;

do $$
declare actor text;
begin
  foreach actor in array array['10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003'] loop
    perform set_config('request.jwt.claim.sub',actor,false);
    if exists(select 1 from public.crm_customer_groups) or exists(select 1 from public.crm_groups)
      or exists(select 1 from public.crm_customer_group_brands) then raise exception 'Unauthorized membership read'; end if;
    begin
      perform public.crm_save_customer_memberships(null,'{"name":"Denied"}','[]',array['nus'],array[]::text[]);
      raise exception 'Unauthorized membership write';
    exception when insufficient_privilege then null;
    end;
  end loop;
end;
$$;
reset role;
select 'CRM membership stage A SQL checks passed' as result;
