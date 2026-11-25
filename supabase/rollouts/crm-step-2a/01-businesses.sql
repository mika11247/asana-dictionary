begin;

create table if not exists public.crm_businesses (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (btrim(name) <> ''),
  is_active boolean not null default true,
  sort_order integer not null,
  prospects_enabled boolean not null default false
);

alter table public.crm_services
  add column if not exists business_code text references public.crm_businesses(code);

create table if not exists public.crm_customer_businesses (
  customer_id bigint not null references public.crm_customers(id),
  business_code text not null references public.crm_businesses(code),
  stage text not null default 'unconfirmed' check (stage in ('unconfirmed', 'prospect', 'customer')),
  business_note text,
  source text not null default 'manual' check (source in ('manual', 'service')),
  archived_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (customer_id, business_code)
);

create index if not exists crm_customer_businesses_active_business_idx
  on public.crm_customer_businesses (business_code, customer_id) where archived_at is null;

alter table public.crm_businesses enable row level security;
alter table public.crm_customer_businesses enable row level security;
revoke all on public.crm_businesses, public.crm_customer_businesses from public, anon, authenticated, service_role;
grant select on public.crm_businesses, public.crm_customer_businesses to authenticated;
grant insert (customer_id, business_code, stage, business_note, source),
  update (stage, business_note, archived_at) on public.crm_customer_businesses to authenticated;

drop policy if exists crm_owner_read on public.crm_businesses;
create policy crm_owner_read on public.crm_businesses for select to authenticated
  using ((select public.is_crm_admin()));
drop policy if exists crm_owner_read on public.crm_customer_businesses;
create policy crm_owner_read on public.crm_customer_businesses for select to authenticated
  using ((select public.is_crm_admin()));
drop policy if exists crm_owner_insert on public.crm_customer_businesses;
create policy crm_owner_insert on public.crm_customer_businesses for insert to authenticated
  with check ((select public.is_crm_admin()));
drop policy if exists crm_owner_update on public.crm_customer_businesses;
create policy crm_owner_update on public.crm_customer_businesses for update to authenticated
  using ((select public.is_crm_admin())) with check ((select public.is_crm_admin()));

insert into public.crm_businesses (code, name, sort_order, prospects_enabled)
values ('third_place', '3rd place', 10, false), ('moments', 'moments', 20, false),
  ('overture', 'Overture', 30, false), ('sunrise', 'Sunrise', 40, false),
  ('unite', 'unite', 50, false), ('fifth_vibes', 'Fifth vibes', 60, false),
  ('om_radiance', 'Om radiance', 70, false), ('nus', 'NUS', 80, true)
on conflict (code) do nothing;

do $$
declare mapping record;
begin
  for mapping in select * from (values
    (1, 'ヨガ', 'third_place'), (2, 'ピラティス', 'third_place'),
    (3, 'ネイル', 'moments'), (4, 'ヒプノ', 'unite'), (5, '占い', 'om_radiance')
  ) as expected(id, name, code)
  loop
    if not exists (
      select 1 from public.crm_services s where s.id = mapping.id and s.name = mapping.name
        and (s.business_code is null or s.business_code = mapping.code)
    ) then
      raise exception 'Existing service does not match approved mapping (ID %)', mapping.id;
    end if;
    update public.crm_services set business_code = mapping.code
    where id = mapping.id and business_code is null;
  end loop;
end;
$$;

create or replace function crm_private.crm_validate_customer_business()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if new.stage = 'prospect' and not exists (
    select 1 from public.crm_businesses where code = new.business_code and prospects_enabled
  ) then
    raise check_violation using message = 'Prospects are disabled for this business';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function crm_private.crm_link_service_business()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  insert into public.crm_customer_businesses (customer_id, business_code, source)
  select new.customer_id, business_code, 'service'
  from public.crm_services where id = new.service_id and business_code is not null
  on conflict (customer_id, business_code) do nothing;
  return new;
end;
$$;

revoke all on function crm_private.crm_validate_customer_business(),
  crm_private.crm_link_service_business() from public, anon, authenticated, service_role;

create or replace trigger crm_validate_customer_business
before insert or update on public.crm_customer_businesses
for each row execute function crm_private.crm_validate_customer_business();

create or replace trigger crm_link_service_business
after insert or update of customer_id, service_id on public.crm_customer_services
for each row execute function crm_private.crm_link_service_business();

-- Installing the trigger first also locks the source against concurrent writes
-- until the backfill commits.
insert into public.crm_customer_businesses (customer_id, business_code, source)
select distinct relation.customer_id, service.business_code, 'service'
from public.crm_customer_services relation
join public.crm_services service on service.id = relation.service_id
where service.business_code is not null
on conflict (customer_id, business_code) do nothing;

commit;
