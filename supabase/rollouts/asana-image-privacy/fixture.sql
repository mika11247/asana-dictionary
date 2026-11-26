-- Synthetic fixture only.
alter table public.asanas add column image_url text, add column is_demo boolean default false;
alter table public.asanas
  add column alias text, add column types text[], add column chakras text[],
  add column howto text, add column effect text, add column caution text,
  add column variation text, add column note text, add column strength text,
  add column flexibility text, add column modification text;
create table public.sequence_items (
  id bigint generated always as identity primary key,
  sequence_id bigint references public.sequences(id), asana_id bigint references public.asanas(id),
  user_id uuid references auth.users(id), type text, memo text, section_title text, position integer
);
insert into public.sequence_items(sequence_id,asana_id,user_id,type,position)
select s.id,a.id,a.user_id,'asana',1 from public.asanas a join public.sequences s using(user_id);
alter table public.sequence_items enable row level security;
create policy own_sequence_items on public.sequence_items
for select to authenticated using(user_id=auth.uid());
grant select on public.sequence_items to authenticated;
create or replace function auth.jwt() returns jsonb language sql stable as
$$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
grant usage on schema auth to anon, authenticated;
grant select, insert, update on public.asanas to service_role;
alter role service_role bypassrls;
grant update on public.asanas to authenticated;
create policy own_asana_update on public.asanas for update to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());
insert into storage.buckets(id,name,public) values ('asana-images','asana-images',true);
create policy "Allow public read from asana images" on storage.objects
for select using(bucket_id='asana-images');
create policy "Allow authenticated uploads to asana images" on storage.objects
for insert to authenticated with check(bucket_id='asana-images');
