-- Execute inside the same transaction as setting crm.approved_owner_id.
create schema crm_private;
revoke all on schema crm_private from public, anon, authenticated, service_role;

create table crm_private.access_owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null references auth.users(id) on delete cascade,
  configured_at timestamptz not null default now()
);
alter table crm_private.access_owner enable row level security;
revoke all on table crm_private.access_owner from public, anon, authenticated, service_role;

do $$
declare
  approved_owner uuid := nullif(current_setting('crm.approved_owner_id', true), '')::uuid;
begin
  if approved_owner is null or not exists (
    select 1 from public.profiles
    where id = approved_owner and is_admin is true
      and status = 'active' and deleted_at is null
  ) then
    raise exception 'An approved active CRM owner is required';
  end if;

  insert into crm_private.access_owner (user_id) values (approved_owner);
end;
$$;
create or replace function public.is_crm_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles as profile
    join crm_private.access_owner as owner on owner.user_id = profile.id
    where profile.id = (select auth.uid())
      and profile.is_admin is true
      and profile.status = 'active'
      and profile.deleted_at is null
  );
$$;
