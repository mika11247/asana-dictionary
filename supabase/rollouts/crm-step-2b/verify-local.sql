\set ON_ERROR_STOP on
\ir ../crm-step-2a/verify-local.sql
create temporary table step2b_snapshot as
select (select jsonb_agg(to_jsonb(c) order by id) from public.crm_customers c) customers,
  (select jsonb_agg(to_jsonb(r) order by id) from public.crm_records r) records,
  (select count(*) from public.crm_customer_businesses) relationships;
\ir 01-nus.sql

do $$
begin
  if exists (select 1 from public.crm_customer_businesses where business_code='nus')
    or exists (select 1 from step2b_snapshot s where
      s.customers is distinct from (select jsonb_agg(to_jsonb(c) order by id) from public.crm_customers c)
      or s.records is distinct from (select jsonb_agg(to_jsonb(r) order by id) from public.crm_records r)
      or s.relationships <> (select count(*) from public.crm_customer_businesses)) then
    raise exception 'Installation changed existing customers or relationships';
  end if;
  if has_table_privilege('authenticated','public.crm_contact_preference_events','INSERT, UPDATE, DELETE, TRUNCATE')
    or has_table_privilege('anon','public.crm_contact_preferences_current','SELECT')
    or has_table_privilege('service_role','public.crm_nus_profiles','SELECT, INSERT, UPDATE, DELETE')
    or has_function_privilege('anon','public.crm_record_contact_preference(bigint,text,text,text,timestamptz,text,uuid,boolean)','EXECUTE') then
    raise exception 'Unexpected direct access';
  end if;
end;
$$;
update public.crm_services set business_code='nus' where id=5;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
do $$
declare new_id bigint;
  details jsonb := '{"product_interest":"interested","product_note":"product note","business_interest":"not_interested","business_note":"business note","disclosure_status":"done","product_proposal_status":"done","product_proposal_on":"2020-01-01","business_proposal_status":"not_done"}';
begin
  new_id := public.crm_create_customer('{"name":"Service only"}','[{"location_id":1,"service_id":5}]');
  if exists(select 1 from public.crm_customer_businesses where customer_id=new_id and business_code='nus') then
    raise exception 'Service-derived NUS relationship';
  end if;
  perform public.crm_record_contact_preference(new_id,'global','refuse','outreach','2023-01-01',null,
    '20000000-0000-0000-0000-000000000008',true);
  if not exists(select 1 from public.crm_contact_preferences_current
    where customer_id=new_id and scope='global' and decision='refuse' and coverage='outreach') then
    raise exception 'Global refusal requires an unrelated NUS association';
  end if;
  new_id := public.crm_create_nus_customer('{"name":"Explicit NUS"}','[]');
  if not exists(select 1 from public.crm_customer_businesses where customer_id=new_id and business_code='nus' and stage='unconfirmed') then
    raise exception 'Explicit registration did not link NUS';
  end if;
  begin
    perform public.crm_save_nus_profile(1,details,'[]');
    raise exception 'NUS details without an association accepted';
  exception when check_violation then null;
  end;
  insert into public.crm_customer_businesses(customer_id,business_code,stage) values(1,'nus','prospect');
  perform public.crm_save_nus_profile(1,details,'[{"type_code":"upline"},{"type_code":"other","other_label":"Synthetic relation"}]');
  if (select count(*) from public.crm_nus_customer_relationships where customer_id=1 and archived_at is null) <> 2
    or not exists (select 1 from public.crm_nus_profiles where customer_id=1 and product_interest='interested'
      and business_interest='not_interested' and product_note='product note' and business_note='business note'
      and disclosure_status='done' and disclosure_on is null and product_proposal_on='2020-01-01'
      and business_proposal_status='not_done')
    or not exists (select 1 from public.crm_customer_businesses where customer_id=1 and business_code='nus' and stage='prospect') then
    raise exception 'Independent profile fields or stage changed';
  end if;
  begin
    perform public.crm_save_nus_profile(1,details || '{"product_note":"should roll back"}','[{"type_code":"other"}]');
    raise exception 'Invalid free entry accepted';
  exception when check_violation then null;
  end;
  if not exists (select 1 from public.crm_nus_profiles where customer_id=1 and product_note='product note') then
    raise exception 'Partial profile update';
  end if;
  perform public.crm_save_nus_profile(1,details,'[{"type_code":"other","other_label":"Synthetic relation"}]');
  if not exists(select 1 from public.crm_nus_customer_relationships where customer_id=1 and type_code='upline' and archived_at is not null) then
    raise exception 'Removed relationship not retained';
  end if;

  perform public.crm_record_contact_preference(1,'nus_business','refuse','outreach','2023-01-02',null,
    '20000000-0000-0000-0000-000000000001',true);
  perform public.crm_record_contact_preference(1,'nus_business','allow','outreach','2023-01-01',null,
    '20000000-0000-0000-0000-000000000002',true);
  begin
    perform public.crm_record_contact_preference(1,'nus_business','allow','outreach','2023-01-02',null,
      '20000000-0000-0000-0000-000000000009',true);
    raise exception 'Equal effective timestamp replaced an existing decision';
  exception when unique_violation then null;
  end;
  perform public.crm_record_contact_preference(1,'nus_business','allow','outreach','2023-01-01',null,
    '20000000-0000-0000-0000-000000000002',true);
  perform public.crm_record_contact_preference(1,'nus_product','allow','outreach','2023-01-03',null,
    '20000000-0000-0000-0000-000000000003',true);
  perform public.crm_record_contact_preference(1,'global','refuse','all_contact','2023-01-04','Synthetic reason',
    '20000000-0000-0000-0000-000000000004',true);
  if (select count(*) from public.crm_contact_preference_events where customer_id=1) <> 4
    or not exists(select 1 from public.crm_contact_preferences_current where customer_id=1 and scope='nus_business' and decision='refuse')
    or not exists(select 1 from public.crm_contact_preferences_current where customer_id=1 and scope='global' and decision='refuse' and coverage='all_contact') then
    raise exception 'Preference ordering or deduplication failed';
  end if;
  perform public.crm_record_contact_preference(1,'global','withdraw','all_contact','2023-01-05',null,
    '20000000-0000-0000-0000-000000000005',true);
  if not exists(select 1 from public.crm_contact_preferences_current where customer_id=1 and scope='global' and decision='withdraw')
    or not exists(select 1 from public.crm_contact_preferences_current where customer_id=1 and scope='nus_business' and decision='refuse') then
    raise exception 'Global withdrawal changed a NUS refusal';
  end if;
  begin
    perform public.crm_record_contact_preference(new_id,'global','refuse','outreach','2023-01-06',null,
      '20000000-0000-0000-0000-000000000006',false);
    raise exception 'Unconfirmed global refusal accepted';
  exception when check_violation then null;
  end;
  update public.crm_customer_businesses set archived_at=now() where customer_id=1 and business_code='nus';
  if not exists(select 1 from public.crm_nus_profiles where customer_id=1) then raise exception 'Archive lost NUS data'; end if;
  begin
    perform public.crm_save_nus_profile(1,details,'[]');
    raise exception 'Archived NUS profile accepted an edit';
  exception when check_violation then null;
  end;
end;
$$;

do $$
declare actor text;
begin
  foreach actor in array array['10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003'] loop
    perform set_config('request.jwt.claim.sub',actor,false);
    if exists(select 1 from public.crm_nus_profiles) or exists(select 1 from public.crm_contact_preferences_current)
      or exists(select 1 from public.crm_contact_preference_events) then raise exception 'Non-owner read'; end if;
    begin
      perform public.crm_save_nus_profile(1,'{}','[]');
      raise exception 'Non-owner write';
    exception when insufficient_privilege then null;
    end;
  end loop;
end;
$$;
reset role;
select 'CRM STEP 2-B SQL checks passed' as result;
