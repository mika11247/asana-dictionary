-- Apply after the private-upload application rollout is verified.
begin;
drop policy "Allow authenticated uploads to asana images" on storage.objects;
commit;
