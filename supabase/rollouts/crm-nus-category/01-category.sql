begin;

create table public.crm_nus_categories (
  customer_id bigint primary key references public.crm_customers(id),
  business_code text not null default 'nus' check (business_code='nus'),
  category text check (category in ('candidate','user','downline','upline','other')),
  other_label text,
  foreign key (customer_id,business_code) references public.crm_customer_businesses(customer_id,business_code),
  check (case when category='other' then other_label is not null and length(btrim(other_label)) between 1 and 200
    else other_label is null end)
);

alter table public.crm_nus_categories enable row level security;
revoke all on public.crm_nus_categories from public, anon, authenticated, service_role;
grant select on public.crm_nus_categories to authenticated;
create policy crm_owner_read on public.crm_nus_categories for select to authenticated using ((select public.is_crm_admin()));

create function crm_private.crm_set_nus_category(target_customer_id bigint, category_code text, other_value text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_crm_admin() then raise insufficient_privilege; end if;
  perform 1 from public.crm_customer_businesses
    where customer_id=target_customer_id and business_code='nus' and archived_at is null for update;
  if not found then raise check_violation using message='Active NUS relationship required'; end if;
  insert into public.crm_nus_categories(customer_id,category,other_label)
  values(target_customer_id,category_code,nullif(btrim(other_value),''))
  on conflict(customer_id) do update set category=excluded.category,other_label=excluded.other_label;
end;
$$;
revoke all on function crm_private.crm_set_nus_category(bigint,text,text) from public, anon, authenticated, service_role;

create or replace function public.crm_save_nus_profile(target_customer_id bigint, details jsonb, relationship_types jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare profile public.crm_nus_profiles;
begin
  if not public.is_crm_admin() then raise insufficient_privilege; end if;
  perform 1 from public.crm_customer_businesses
    where customer_id = target_customer_id and business_code = 'nus' and archived_at is null for update;
  if not found then raise check_violation using message = 'Active NUS relationship required'; end if;

  profile := pg_catalog.jsonb_populate_record(null::public.crm_nus_profiles, details);
  if greatest(profile.disclosure_on, profile.product_proposal_on, profile.business_proposal_on)
    > (now() at time zone 'Asia/Tokyo')::date then
    raise check_violation using message = 'First occurrence cannot be in the future';
  end if;
  insert into public.crm_nus_profiles (customer_id, product_interest, product_note, business_interest, business_note,
    disclosure_status, disclosure_on, product_proposal_status, product_proposal_on, business_proposal_status, business_proposal_on)
  values (target_customer_id, profile.product_interest, nullif(btrim(profile.product_note), ''),
    profile.business_interest, nullif(btrim(profile.business_note), ''), profile.disclosure_status, profile.disclosure_on,
    profile.product_proposal_status, profile.product_proposal_on, profile.business_proposal_status, profile.business_proposal_on)
  on conflict (customer_id) do update set
    product_interest=excluded.product_interest, product_note=excluded.product_note,
    business_interest=excluded.business_interest, business_note=excluded.business_note,
    disclosure_status=excluded.disclosure_status, disclosure_on=excluded.disclosure_on,
    product_proposal_status=excluded.product_proposal_status, product_proposal_on=excluded.product_proposal_on,
    business_proposal_status=excluded.business_proposal_status, business_proposal_on=excluded.business_proposal_on,
    updated_at=now();

  -- SQL NULL means keep every legacy relationship row.
  if relationship_types is null then return; end if;
  if pg_catalog.jsonb_typeof(relationship_types) is distinct from 'array' then raise check_violation; end if;
  if exists (
    select 1 from pg_catalog.jsonb_to_recordset(relationship_types) as selected(type_code text)
    left join public.crm_nus_relationship_types t on t.code=selected.type_code and t.is_active
    where t.code is null and not exists (
      select 1 from public.crm_nus_customer_relationships r where r.customer_id=target_customer_id
        and r.type_code=selected.type_code and r.archived_at is null
    )
  ) then raise check_violation using message = 'Unknown or inactive relationship type'; end if;
  update public.crm_nus_customer_relationships r set archived_at=now()
  where r.customer_id=target_customer_id and r.archived_at is null and not exists (
    select 1 from pg_catalog.jsonb_to_recordset(relationship_types) as selected(type_code text)
    where selected.type_code=r.type_code
  );
  insert into public.crm_nus_customer_relationships (customer_id, type_code, other_label)
  select target_customer_id, selected.type_code, nullif(btrim(selected.other_label), '')
  from pg_catalog.jsonb_to_recordset(relationship_types) as selected(type_code text, other_label text)
  on conflict (customer_id, type_code) do update set other_label=excluded.other_label, archived_at=null;
end;
$$;


create function public.crm_save_nus_profile_and_category(target_customer_id bigint, details jsonb, category_code text, other_value text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_crm_admin() then raise insufficient_privilege; end if;
  perform public.crm_save_nus_profile(target_customer_id, details, null);
  perform crm_private.crm_set_nus_category(target_customer_id, category_code, other_value);
end;
$$;

create function public.crm_create_customer_with_nus_category(customer jsonb, relations jsonb, selected_groups text[], selected_brands text[],
  lilly_details jsonb, category_code text, other_value text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare saved_id bigint;
begin
  if not public.is_crm_admin() then raise insufficient_privilege; end if;
  if ('nus'=any(selected_groups)) is not true then raise check_violation using message='Explicit NUS selection required'; end if;
  if 'lilly'=any(selected_groups) then
    saved_id := public.crm_create_customer_with_lilly(customer,relations,selected_groups,selected_brands,
      lilly_details->>'membership',array(select jsonb_array_elements_text(lilly_details->'services')));
  else
    saved_id := public.crm_save_customer_memberships(null,customer,relations,selected_groups,selected_brands);
  end if;
  perform crm_private.crm_set_nus_category(saved_id,category_code,other_value);
  return saved_id;
end;
$$;

revoke all on function public.crm_save_nus_profile_and_category(bigint,jsonb,text,text), public.crm_create_customer_with_nus_category(jsonb,jsonb,text[],text[],jsonb,text,text) from public, anon, authenticated, service_role;
grant execute on function public.crm_save_nus_profile_and_category(bigint,jsonb,text,text), public.crm_create_customer_with_nus_category(jsonb,jsonb,text[],text[],jsonb,text,text) to authenticated;

commit;
