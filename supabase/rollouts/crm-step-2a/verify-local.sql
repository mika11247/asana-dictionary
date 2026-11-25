\set ON_ERROR_STOP on
\ir ../crm-step-1/verify-local.sql

insert into crm_private.access_owner (user_id) values ('10000000-0000-0000-0000-000000000001');
alter table public.crm_services add column name text;
update public.crm_services set name = 'ヨガ' where id = 1;
insert into public.crm_services (name) values ('ピラティス'), ('ネイル'), ('ヒプノ'), ('占い');
insert into public.crm_customer_services (customer_id, location_id, service_id) values (1, 1, 1), (1, 1, 2);

create temporary table existing_crm as
select (select jsonb_agg(to_jsonb(c) order by id) from public.crm_customers c) customers,
  (select jsonb_agg(to_jsonb(r) order by id) from public.crm_records r) records,
  (select jsonb_agg(to_jsonb(s) order by id) from public.crm_customer_services s) services,
  (select jsonb_agg(to_jsonb(l) order by id) from public.crm_locations l) locations;

\ir 01-businesses.sql

do $$
begin
  if (select count(*) from public.crm_businesses) <> 8
    or (select code from public.crm_businesses where prospects_enabled) is distinct from 'nus'
    or (select count(*) from public.crm_customer_businesses where customer_id = 1 and
      business_code = 'third_place' and stage = 'unconfirmed' and source = 'service') <> 1
    or exists (select 1 from public.crm_customer_businesses b join public.crm_customers c on c.id = b.customer_id
      where c.name = 'no relations') then
    raise exception 'Incorrect seed or backfill';
  end if;
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
insert into public.crm_customer_businesses (customer_id, business_code, business_note)
values (1, 'moments', 'Synthetic note');
update public.crm_customer_businesses set stage = 'customer', business_note = 'Confirmed manually'
where customer_id = 1 and business_code = 'third_place';
update public.crm_customer_businesses set archived_at = now() where customer_id = 1 and business_code = 'moments';

do $$
begin
  if (select count(*) from public.crm_customer_businesses where customer_id = 1) <> 2
    or (select count(*) from public.crm_customer_businesses where customer_id = 1 and archived_at is null) <> 1 then
    raise exception 'Multi-business or archive check failed';
  end if;
  begin
    insert into public.crm_customer_businesses (customer_id, business_code) values (1, 'moments');
    raise exception 'Duplicate business accepted';
  exception when unique_violation then null;
  end;
  begin
    update public.crm_customer_businesses set stage = 'prospect' where customer_id = 1 and business_code = 'moments';
    raise exception 'Non-NUS prospect accepted';
  exception when check_violation then null;
  end;
end;
$$;
reset role;

\ir 01-businesses.sql

do $$
begin
  if not exists (select 1 from public.crm_customer_businesses
      where customer_id = 1 and business_code = 'third_place' and stage = 'customer' and business_note = 'Confirmed manually')
    or not exists (select 1 from public.crm_customer_businesses
      where customer_id = 1 and business_code = 'moments' and archived_at is not null)
    or exists (
      select 1 from existing_crm e where
        e.customers is distinct from (select jsonb_agg(to_jsonb(c) order by id) from public.crm_customers c)
        or e.records is distinct from (select jsonb_agg(to_jsonb(r) order by id) from public.crm_records r)
        or e.services is distinct from (select jsonb_agg(to_jsonb(s) order by id) from public.crm_customer_services s)
        or e.locations is distinct from (select jsonb_agg(to_jsonb(l) order by id) from public.crm_locations l)
    ) then
    raise exception 'Rerun overwrote existing data';
  end if;
  if has_table_privilege('authenticated', 'public.crm_customers', 'DELETE')
    or has_table_privilege('authenticated', 'public.crm_customer_businesses', 'DELETE, TRUNCATE, TRIGGER, REFERENCES')
    or has_table_privilege('anon', 'public.crm_businesses', 'SELECT')
    or has_table_privilege('service_role', 'public.crm_businesses', 'SELECT, TRUNCATE')
    or has_any_column_privilege('service_role', 'public.crm_customer_businesses', 'SELECT, INSERT, UPDATE')
    or has_any_column_privilege('anon', 'public.crm_customer_businesses', 'SELECT, INSERT, UPDATE') then
    raise exception 'Unexpected privilege';
  end if;
end;
$$;

set role authenticated;
do $$
declare new_id bigint;
begin
  new_id := public.crm_create_customer('{"name":"step 2a created"}', '[{"location_id":1,"service_id":1}]');
  if not exists (select 1 from public.crm_customer_businesses
      where customer_id = new_id and business_code = 'third_place' and stage = 'unconfirmed') then
    raise exception 'Step 1 registration did not link the business';
  end if;
  delete from public.crm_customer_services where customer_id = new_id;
  if not exists (select 1 from public.crm_customer_businesses where customer_id = new_id and business_code = 'third_place') then
    raise exception 'Service removal deleted business history';
  end if;
  insert into public.crm_customer_services (customer_id, location_id, service_id) values (new_id, 1, 3);
  if (select count(*) from public.crm_customer_businesses where customer_id = new_id) <> 2 then
    raise exception 'Service edit did not link the additional business';
  end if;
end;
$$;

do $$
declare candidate text;
begin
  foreach candidate in array array['10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003']
  loop
    perform set_config('request.jwt.claim.sub', candidate, false);
    if exists (select 1 from public.crm_businesses) or exists (select 1 from public.crm_customer_businesses) then
      raise exception 'Non-owner can read business information';
    end if;
    begin
      insert into public.crm_customer_businesses (customer_id, business_code) values (1, 'nus');
      raise exception 'Non-owner can add a business relationship';
    exception when insufficient_privilege then null;
    end;
    update public.crm_customer_businesses set business_note = 'Denied' where customer_id = 1;
    if found then raise exception 'Non-owner can update a business relationship'; end if;
  end loop;
end;
$$;
reset role;
select 'CRM STEP 2-A SQL checks passed' as result;
