-- Run in a transaction after 01. The local setting is the approved source hash.
set local lock_timeout = '5s';
lock table public.crm_locations, public.crm_services in share mode;
lock table public.crm_records in access exclusive mode;

do $$
declare
  source_hash text;
  item record;
  expected_group text;
  expected_brand text;
begin
  select md5(jsonb_agg(to_jsonb(r)-'record_group_code'-'record_brand_code'-'location_label'-'service_label' order by r.id)::text)
    into source_hash from public.crm_records r where r.location_id is not null or r.service_id is not null;
  if source_hash is null or source_hash is distinct from current_setting('crm.records_source_hash',true)
    or (select count(*) from public.crm_records where location_id=1 and service_id=1)<>3
    or (select count(*) from public.crm_records where location_id=2 and service_id=1)<>1
    or (select count(*) from public.crm_records where location_id is not null or service_id is not null)<>4 then
    raise exception 'Unapproved legacy record source';
  end if;

  alter table public.crm_records disable trigger crm_validate_record_context;
  alter table public.crm_records disable trigger set_crm_records_updated_at;
  for item in
    select r.*, l.name as old_location, s.name as old_service
    from public.crm_records r join public.crm_locations l on l.id=r.location_id
    join public.crm_services s on s.id=r.service_id
  loop
    expected_group := case item.location_id when 1 then 'lilly' else 'mglitter' end;
    expected_brand := case item.location_id when 2 then 'third_place' else null end;
    if item.old_location is distinct from (case item.location_id when 1 then 'yoga&pilates Lilly' else '3rd place' end)
      or item.old_service is distinct from 'ヨガ' then
      raise exception 'Unapproved legacy master label';
    end if;
    if (item.record_group_code is null and item.record_brand_code is null and item.location_label is null and item.service_label is null) then
      update public.crm_records set record_group_code=expected_group,record_brand_code=expected_brand,
        location_label=item.old_location,service_label=item.old_service where id=item.id;
    elsif (item.record_group_code,item.record_brand_code,item.location_label,item.service_label) is distinct from
          (expected_group,expected_brand,item.old_location,item.old_service) then
      raise exception 'Existing record context conflicts with approved source';
    end if;
  end loop;
  alter table public.crm_records enable trigger set_crm_records_updated_at;
  alter table public.crm_records enable trigger crm_validate_record_context;
end $$;
