select jsonb_build_object(
  'customers', (select count(*) from public.crm_customers),
  'archived', (select count(*) from public.crm_customers where archived),
  'relationships', (select count(*) from public.crm_customer_services),
  'records', (select count(*) from public.crm_records),
  'customer_hash', (select md5(string_agg(to_jsonb(x)::text, '' order by id)) from public.crm_customers x),
  'relationship_hash', (select md5(string_agg(to_jsonb(x)::text, '' order by id)) from public.crm_customer_services x),
  'record_hash', (select md5(string_agg(to_jsonb(x)::text, '' order by id)) from public.crm_records x),
  'locations_hash', (select md5(string_agg(to_jsonb(x)::text, '' order by id)) from public.crm_locations x),
  'services_hash', (select md5(string_agg(to_jsonb(x)::text, '' order by id)) from public.crm_services x),
  'orphans', (select count(*) from (
    select customer_id, location_id, service_id from public.crm_customer_services
    union all select customer_id, location_id, service_id from public.crm_records
  ) x left join public.crm_customers c on c.id=x.customer_id
      left join public.crm_locations l on l.id=x.location_id
      left join public.crm_services s on s.id=x.service_id
  where c.id is null or l.id is null or s.id is null),
  'rls_acl', (select jsonb_agg(jsonb_build_object('table', c.relname, 'rls', c.relrowsecurity,
    'acl', to_jsonb(array(select a::text from unnest(c.relacl) a order by a::text)))
    order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and left(c.relname,4)='crm_' and c.relkind in ('r','S')),
  'policy_hash', (select md5(jsonb_agg(to_jsonb(p) order by tablename, policyname)::text)
    from pg_policies p where schemaname='public' and left(tablename,4)='crm_'),
  'function_hash', md5(pg_get_functiondef('public.is_crm_admin()'::regprocedure)),
  'trigger_functions_hash', (select md5(string_agg(distinct pg_get_functiondef(t.tgfoid), '' order by pg_get_functiondef(t.tgfoid)))
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and left(c.relname,4)='crm_' and not t.tgisinternal),
  'foreign_keys_hash', (select md5(jsonb_agg(jsonb_build_array(c.relname, k.conname, pg_get_constraintdef(k.oid), k.convalidated)
    order by c.relname, k.conname)::text) from pg_constraint k join pg_class c on c.oid=k.conrelid
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and left(c.relname,4)='crm_' and k.contype='f'),
  'role_membership_hash', (select md5(jsonb_agg(jsonb_build_array(r.rolname, m.rolname, a.admin_option, a.inherit_option, a.set_option)
    order by r.rolname, m.rolname, a.admin_option, a.inherit_option, a.set_option)::text)
    from pg_auth_members a join pg_roles r on r.oid=a.roleid join pg_roles m on m.oid=a.member
    where m.rolname <> 'restore_verifier'),
  'crm_triggers', (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and left(c.relname,4)='crm_' and not t.tgisinternal),
  'auth_users', (select count(*) from auth.users),
  'auth_identities', (select count(*) from auth.identities),
  'storage_buckets', (select count(*) from storage.buckets),
  'storage_objects', (select count(*) from storage.objects),
  'roles', (select count(*) from pg_roles where rolname not like 'pg\_%' and rolname <> 'restore_verifier')
);
