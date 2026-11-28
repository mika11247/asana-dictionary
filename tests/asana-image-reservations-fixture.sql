-- For the isolated PostgreSQL container only.
create schema storage;
create schema auth;
create table auth.users (id uuid primary key);
create table public.profiles (
  id uuid primary key references auth.users,
  plan text not null,
  status text not null default 'active',
  deleted_at timestamptz
);
create table public.asanas (id bigint primary key, private_image_path text);
create table public.crm_customers (id bigint primary key);
create table storage.objects (
  bucket_id text not null, name text not null, metadata jsonb,
  primary key(bucket_id,name)
);
alter table public.asanas enable row level security;
alter table public.crm_customers enable row level security;
alter table storage.objects enable row level security;
create policy fixture_asanas on public.asanas for select to authenticated using (false);
create policy fixture_crm on public.crm_customers for select to authenticated using (false);
create policy fixture_legacy on storage.objects for insert to authenticated
  with check (bucket_id = 'asana-images');
grant usage on schema storage to authenticated;
grant insert on storage.objects to authenticated;
-- Reproduce the broad function defaults observed in Production.
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
insert into auth.users values
  ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000003'), ('00000000-0000-4000-8000-000000000004');
insert into public.profiles(id,plan) select id, case right(id::text,1)
  when '1' then 'free' when '2' then 'support' when '3' then 'special' else 'pro' end
from auth.users;
insert into public.asanas values (1,null);
insert into public.crm_customers values (1);
