begin;

revoke all on table public.crm_customers, public.crm_customer_services,
  public.crm_records, public.crm_locations, public.crm_services from public, anon, authenticated;
revoke all on sequence public.crm_customers_id_seq, public.crm_customer_services_id_seq,
  public.crm_records_id_seq, public.crm_locations_id_seq, public.crm_services_id_seq
  from public, anon, authenticated;

-- Keep the old client's compensating delete until the atomic RPC is in use.
grant select, insert, update, delete on table public.crm_customers,
  public.crm_customer_services, public.crm_records to authenticated;
grant select, insert, update on table public.crm_locations, public.crm_services to authenticated;

create or replace function public.is_crm_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and is_admin is true
      and status = 'active'
      and deleted_at is null
  );
$$;

revoke all on function public.is_crm_admin() from public, anon;
grant execute on function public.is_crm_admin() to authenticated;

create function public.crm_create_customer(customer jsonb, relations jsonb)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_customer_id bigint;
begin
  if not public.is_crm_admin() then
    raise insufficient_privilege using message = 'CRM access denied';
  end if;

  insert into public.crm_customers (
    name, nickname, name_yomi, photo_permission, customer_request, care_notes, private_note
  )
  values (
    customer ->> 'name', customer ->> 'nickname', customer ->> 'name_yomi',
    coalesce(customer ->> 'photo_permission', 'unknown'),
    customer ->> 'customer_request', customer ->> 'care_notes', customer ->> 'private_note'
  )
  returning id into new_customer_id;

  insert into public.crm_customer_services (customer_id, location_id, service_id, membership_type)
  select new_customer_id, item.location_id, item.service_id, item.membership_type
  from pg_catalog.jsonb_to_recordset(relations)
    as item(location_id bigint, service_id bigint, membership_type text);

  return new_customer_id;
end;
$$;

revoke all on function public.crm_create_customer(jsonb, jsonb) from public, anon;
grant execute on function public.crm_create_customer(jsonb, jsonb) to authenticated;

commit;
