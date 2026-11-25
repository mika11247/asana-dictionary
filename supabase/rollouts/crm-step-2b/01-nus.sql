begin;

create table public.crm_nus_profiles (
  customer_id bigint primary key,
  business_code text not null default 'nus' check (business_code = 'nus'),
  product_interest text not null default 'unknown' check (product_interest in ('unknown', 'interested', 'considering', 'not_interested')),
  product_note text,
  business_interest text not null default 'unknown' check (business_interest in ('unknown', 'interested', 'considering', 'not_interested')),
  business_note text,
  disclosure_status text not null default 'unknown' check (disclosure_status in ('unknown', 'not_done', 'done')),
  disclosure_on date check (disclosure_on is null or disclosure_status = 'done'),
  product_proposal_status text not null default 'unknown' check (product_proposal_status in ('unknown', 'not_done', 'done')),
  product_proposal_on date check (product_proposal_on is null or product_proposal_status = 'done'),
  business_proposal_status text not null default 'unknown' check (business_proposal_status in ('unknown', 'not_done', 'done')),
  business_proposal_on date check (business_proposal_on is null or business_proposal_status = 'done'),
  updated_at timestamptz not null default now(),
  foreign key (customer_id, business_code) references public.crm_customer_businesses(customer_id, business_code)
);

create table public.crm_nus_relationship_types (
  code text primary key,
  label text not null,
  sort_order integer not null unique,
  is_active boolean not null default true
);

insert into public.crm_nus_relationship_types (code, label, sort_order) values
  ('upline','アップライン',10), ('downline','ダウンライン',20), ('sideline','サイドライン',30),
  ('team','その他チームメンバー',40), ('business_prospect','ビジネス見込み客',50),
  ('product_contact','商品ユーザー／見込み客',60), ('other','その他',70);

create table public.crm_nus_customer_relationships (
  customer_id bigint not null references public.crm_nus_profiles(customer_id),
  type_code text not null references public.crm_nus_relationship_types(code),
  other_label text,
  archived_at timestamptz,
  primary key (customer_id, type_code),
  check ((type_code = 'other' and nullif(btrim(other_label), '') is not null)
    or (type_code <> 'other' and other_label is null))
);
create index crm_nus_active_type_idx on public.crm_nus_customer_relationships (type_code, customer_id) where archived_at is null;

create table public.crm_contact_preference_events (
  id bigint generated always as identity primary key,
  request_id uuid not null unique,
  customer_id bigint not null references public.crm_customers(id),
  business_code text,
  scope text not null check (scope in ('global', 'nus_all', 'nus_business', 'nus_product')),
  decision text not null check (decision in ('refuse', 'allow', 'withdraw')),
  coverage text not null check (coverage in ('outreach', 'all_contact')),
  confirmed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  reason text,
  recorded_by uuid not null,
  foreign key (customer_id, business_code) references public.crm_customer_businesses(customer_id, business_code),
  check ((scope = 'global' and business_code is null) or (scope <> 'global' and business_code is not distinct from 'nus')),
  check (scope in ('global', 'nus_all') or coverage = 'outreach')
);
create unique index crm_contact_latest_idx on public.crm_contact_preference_events (customer_id, scope, confirmed_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array['crm_nus_profiles', 'crm_nus_relationship_types',
    'crm_nus_customer_relationships', 'crm_contact_preference_events']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', table_name);
    execute format('grant select on public.%I to authenticated', table_name);
    execute format('create policy crm_owner_read on public.%I for select to authenticated using ((select public.is_crm_admin()))', table_name);
  end loop;
end;
$$;
revoke all on sequence public.crm_contact_preference_events_id_seq from public, anon, authenticated, service_role;

create view public.crm_contact_preferences_current with (security_invoker = true) as
select distinct on (customer_id, scope) customer_id, scope, decision, coverage, confirmed_at
from public.crm_contact_preference_events
order by customer_id, scope, confirmed_at desc;
revoke all on public.crm_contact_preferences_current from public, anon, authenticated, service_role;
grant select on public.crm_contact_preferences_current to authenticated;

-- Keep the STEP 2-A behavior for other businesses. NUS requires a manual link.
alter table public.crm_customer_businesses add constraint crm_nus_manual_source
  check (business_code <> 'nus' or source = 'manual');

create or replace function crm_private.crm_link_service_business()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  insert into public.crm_customer_businesses (customer_id, business_code, source)
  select new.customer_id, business_code, 'service'
  from public.crm_services where id = new.service_id and business_code <> 'nus'
  on conflict (customer_id, business_code) do nothing;
  return new;
end;
$$;

create function public.crm_create_nus_customer(customer jsonb, relations jsonb)
returns bigint
language plpgsql security invoker set search_path = ''
as $$
declare new_id bigint;
begin
  new_id := public.crm_create_customer(customer, relations);
  insert into public.crm_customer_businesses(customer_id, business_code) values(new_id, 'nus');
  return new_id;
end;
$$;

create function public.crm_save_nus_profile(target_customer_id bigint, details jsonb, relationship_types jsonb)
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

create function public.crm_record_contact_preference(target_customer_id bigint, requested_scope text, requested_decision text,
  requested_coverage text, effective_at timestamptz, optional_reason text, dedup_id uuid, expressly_confirmed boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_crm_admin() then raise insufficient_privilege; end if;
  if expressly_confirmed is distinct from true or effective_at is null or effective_at > now() then
    raise check_violation using message = 'Confirmed past or current preference required';
  end if;
  if requested_scope <> 'global' then
    perform 1 from public.crm_customer_businesses
      where customer_id=target_customer_id and business_code='nus' and archived_at is null for update;
    if not found then raise check_violation using message = 'Active NUS relationship required'; end if;
  end if;
  insert into public.crm_contact_preference_events
    (request_id, customer_id, business_code, scope, decision, coverage, confirmed_at, reason, recorded_by)
  values (dedup_id, target_customer_id, case when requested_scope <> 'global' then 'nus' end,
    requested_scope, requested_decision, requested_coverage, effective_at, nullif(btrim(optional_reason), ''), auth.uid())
  on conflict (request_id) do nothing;
end;
$$;

revoke all on function public.crm_create_nus_customer(jsonb,jsonb),
  public.crm_save_nus_profile(bigint,jsonb,jsonb),
  public.crm_record_contact_preference(bigint,text,text,text,timestamptz,text,uuid,boolean) from public, anon, authenticated, service_role;
grant execute on function public.crm_create_nus_customer(jsonb,jsonb),
  public.crm_save_nus_profile(bigint,jsonb,jsonb),
  public.crm_record_contact_preference(bigint,text,text,text,timestamptz,text,uuid,boolean) to authenticated;

commit;
