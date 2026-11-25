#!/usr/bin/env bash
set -euo pipefail

cd /crm-test
test "$(psql -At -c "select count(*) from auth.users where email in ('owner@crm.test','test-admin@crm.test','member@crm.test')";)" = 3
{
  cat <<'SQL'
create or replace function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;
grant usage on schema auth to authenticated;
create table public.profiles (
  id uuid primary key references auth.users, is_admin boolean not null,
  status text not null default 'active', deleted_at timestamptz,
  display_name text, email text, plan text default 'free'
);
insert into public.profiles (id, is_admin, email, display_name)
select id, email <> 'member@crm.test', email, split_part(email, '@', 1)
from auth.users where email in ('owner@crm.test','test-admin@crm.test','member@crm.test');
alter table public.profiles enable row level security;
create policy own_profile on public.profiles for all to authenticated
using (id = auth.uid()) with check (id = auth.uid());
SQL
  sed -n '/^create table public.crm_customers/,/^\\ir 01-prepare.sql/p' verify-local.sql
  cat <<'SQL'
begin;
select set_config('crm.approved_owner_id', (select id::text from public.profiles where email = 'owner@crm.test'), true) is not null;
\ir 02-owner-only.sql
commit;
\ir 03-remove-customer-delete.sql
alter table public.crm_customers add column is_favorite boolean default false,
  add column is_pinned boolean default false, add column archived_at timestamptz;
alter table public.crm_locations add column name text default 'Synthetic studio',
  add column is_active boolean default true, add column sort_order integer default 1;
alter table public.crm_services add column name text default 'Synthetic service',
  add column is_active boolean default true, add column sort_order integer default 1;
alter table public.crm_records add column record_date date default current_date,
  add column created_at timestamptz default now(),
  add column location_id bigint references public.crm_locations,
  add column service_id bigint references public.crm_services;
create table public.asanas (
  id bigint generated always as identity primary key, user_id uuid references auth.users,
  title text, sanskrit text, yomi text, category text, created_at timestamptz default now()
);
insert into public.asanas (user_id, title, sanskrit) select id, 'Synthetic pose', '検証ポーズ' from public.profiles;
create table public.initial_asanas (like public.asanas);
create table public.sequences (
  id bigint generated always as identity primary key, user_id uuid references auth.users,
  title text, memo text default '', position integer default 1, folder_id bigint,
  created_at timestamptz default now()
);
insert into public.sequences (user_id, title) select id, 'Synthetic sequence' from public.profiles;
create table public.sequence_folders (
  id bigint generated always as identity primary key, user_id uuid references auth.users,
  name text, position integer, created_at timestamptz default now()
);
create table public.initial_sequences (
  id bigint generated always as identity primary key, title text, preset_key text,
  display_group text, display_order integer, position integer
);
insert into public.initial_sequences (title, preset_key, display_group, display_order, position)
values ('Synthetic preset', 'acceptance_fixture', 'asana_pack', 1, 1);
alter table public.asanas enable row level security;
alter table public.sequences enable row level security;
alter table public.sequence_folders enable row level security;
create policy own_asanas on public.asanas for select to authenticated using (user_id = auth.uid());
create policy own_sequences on public.sequences for select to authenticated using (user_id = auth.uid());
create policy own_folders on public.sequence_folders for select to authenticated using (user_id = auth.uid());
grant select on public.asanas, public.sequences, public.sequence_folders to authenticated;
grant select on public.initial_asanas, public.initial_sequences to anon, authenticated;
grant update (display_name) on public.profiles to authenticated;
notify pgrst, 'reload schema';
SQL
} | psql -X -v ON_ERROR_STOP=1
