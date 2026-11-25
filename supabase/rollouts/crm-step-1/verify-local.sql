\set ON_ERROR_STOP on

create role anon;
create role authenticated;
create role service_role;
create schema auth;
grant usage on schema auth to authenticated;
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table auth.users (id uuid primary key);
create table public.profiles (
  id uuid primary key references auth.users, is_admin boolean not null,
  status text not null default 'active', deleted_at timestamptz
);
insert into auth.users values ('10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002'), ('10000000-0000-0000-0000-000000000003');
insert into public.profiles (id, is_admin)
select id, right(id::text, 1) <> '3' from auth.users;

create table public.crm_customers (
  id bigint generated always as identity primary key, name text not null,
  nickname text, name_yomi text, photo_permission text, customer_request text,
  care_notes text, private_note text, archived boolean not null default false
);
create table public.crm_locations (id bigint generated always as identity primary key);
create table public.crm_services (id bigint generated always as identity primary key);
create table public.crm_records (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.crm_customers on delete cascade
);
create table public.crm_customer_services (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.crm_customers on delete cascade,
  location_id bigint not null references public.crm_locations,
  service_id bigint not null references public.crm_services,
  membership_type text, unique (customer_id, location_id, service_id)
);

create function public.is_crm_admin() returns boolean language sql stable security definer
set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin)
$$;
do $$
declare crm_table regclass;
begin
  foreach crm_table in array array['crm_customers', 'crm_locations', 'crm_services',
    'crm_records', 'crm_customer_services']::regclass[]
  loop
    execute format('alter table %s enable row level security', crm_table);
    execute format('create policy test_admin on %s to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin())', crm_table);
  end loop;
end;
$$;
grant all on table public.crm_customers, public.crm_customer_services,
  public.crm_records, public.crm_locations, public.crm_services to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (status, deleted_at) on public.profiles to authenticated;
grant all on all sequences in schema public to anon, authenticated;
insert into public.crm_locations default values;
insert into public.crm_services default values;
insert into public.crm_customers (name) values ('existing fixture');
insert into public.crm_records (customer_id) values (1);

\ir 01-prepare.sql
begin;
select set_config('crm.approved_owner_id', '10000000-0000-0000-0000-000000000001', true);
\ir 02-owner-only.sql
commit;
\ir 03-remove-customer-delete.sql

do $$
declare crm_table regclass;
begin
  foreach crm_table in array array['crm_customers', 'crm_locations', 'crm_services',
    'crm_records', 'crm_customer_services']::regclass[]
  loop
    if has_table_privilege('anon', crm_table, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES')
      or has_table_privilege('authenticated', crm_table, 'TRUNCATE, TRIGGER, REFERENCES') then
      raise exception 'Unexpected table grants on %', crm_table;
    end if;
    if has_sequence_privilege('authenticated', 'public.' || crm_table::text || '_id_seq', 'SELECT, USAGE, UPDATE')
      or has_sequence_privilege('anon', 'public.' || crm_table::text || '_id_seq', 'SELECT, USAGE, UPDATE') then
      raise exception 'Unexpected sequence grants on %', crm_table;
    end if;
  end loop;
  if has_table_privilege('authenticated', 'public.crm_customers', 'DELETE')
    or has_column_privilege('authenticated', 'public.profiles', 'is_admin', 'UPDATE')
    or has_table_privilege('authenticated', 'crm_private.access_owner', 'SELECT, INSERT, UPDATE, DELETE')
    or has_function_privilege('anon', 'public.crm_create_customer(jsonb,jsonb)', 'EXECUTE')
    or has_function_privilege('anon', 'public.is_crm_admin()', 'EXECUTE') then
    raise exception 'Unexpected customer deletion or RPC grant';
  end if;
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
do $$
declare customer_id_created bigint;
begin
  if not public.is_crm_admin() then raise exception 'Owner denied'; end if;
  customer_id_created := public.crm_create_customer('{"name":"new fixture"}',
    '[{"location_id":1,"service_id":1,"membership_type":"体験"}]');
  if not exists (select 1 from public.crm_customer_services where customer_id = customer_id_created) then
    raise exception 'Relation was not saved';
  end if;
  perform public.crm_create_customer('{"name":"no relations"}', '[]');
  begin
    perform public.crm_create_customer('{"name":"must roll back"}', '[{"location_id":1,"service_id":999}]');
    raise exception 'Invalid relation was accepted';
  exception when foreign_key_violation then null;
  end;
  if exists (select 1 from public.crm_customers where name = 'must roll back') then
    raise exception 'Failed registration left a customer';
  end if;
  update public.crm_customers set archived = true where id = customer_id_created;
  if not found then raise exception 'Archive denied'; end if;
  update public.crm_customers set archived = false where id = customer_id_created;
  if not found then raise exception 'Restore denied'; end if;
  begin
    delete from public.crm_customers where id = 1;
    raise exception 'Physical deletion was accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;

do $$
declare candidate uuid;
begin
  foreach candidate in array array['10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003']::uuid[]
  loop
    perform set_config('request.jwt.claim.sub', candidate::text, false);
    if public.is_crm_admin() or exists (select 1 from public.crm_customers) then
      raise exception 'Non-owner can read CRM';
    end if;
    begin
      perform public.crm_create_customer('{"name":"denied"}', '[]');
      raise exception 'Non-owner can create CRM customers';
    exception when insufficient_privilege then null;
    end;
  end loop;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
reset role;
update public.profiles set status = 'scheduled_deletion', deleted_at = now()
where id = auth.uid();
set role authenticated;
do $$ begin
  if public.is_crm_admin() or exists (select 1 from public.crm_records) then
    raise exception 'Scheduled deletion still has access';
  end if;
end $$;
reset role;
update public.profiles set status = 'active', deleted_at = null, is_admin = false where id = auth.uid();
set role authenticated;
do $$ begin
  if public.is_crm_admin() or exists (select 1 from public.crm_customers) then
    raise exception 'Revoked administrator still has access';
  end if;
end $$;
reset role;
update public.profiles set is_admin = true where id = auth.uid();
delete from crm_private.access_owner where user_id = auth.uid();
set role authenticated;
do $$ begin
  if public.is_crm_admin() or exists (select 1 from public.crm_customers) then
    raise exception 'Revoked CRM owner still has access';
  end if;
end $$;
reset role;
select 'CRM STEP 1 SQL checks passed' as result;
