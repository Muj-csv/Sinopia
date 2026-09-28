-- Publishing to the globe failed for every artist, every time, with
--   "new row violates row-level security policy for table objects".
--
-- publishFresco copies the four images into the 'globe' bucket with upload({ upsert: true }),
-- which Supabase Storage issues as INSERT ... ON CONFLICT DO UPDATE. That statement needs more
-- than an INSERT policy:
--
--   INSERT only                -> rejected, even when nothing conflicts
--   INSERT + UPDATE            -> still rejected
--   INSERT + SELECT            -> first publish works, re-publish rejected
--   INSERT + SELECT + UPDATE   -> works
--
-- Postgres must be able to SEE the row it might conflict with before it can decide whether to take
-- the DO UPDATE branch, and must be allowed to UPDATE it if it does. 'globe' had only INSERT and
-- DELETE. 'sketchbook' is declared FOR ALL, which covers all four -- which is exactly why saving
-- worked and publishing did not.
--
-- These two are scoped to the owner's own folder, like every other policy here. They do not widen
-- who can read published images: the bucket is public, and that read is served from the public URL
-- without consulting these policies at all. This only lets an artist see and replace their own
-- files, which is what publishing and re-publishing are.

create policy "owner reads own globe files" on storage.objects
  for select to authenticated
  using (bucket_id = 'globe' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owner updates own globe files" on storage.objects
  for update to authenticated
  using (bucket_id = 'globe' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'globe' and (storage.foldername(name))[1] = auth.uid()::text);
