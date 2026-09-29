-- Update 1.2 gives every artist an avatar.
--
-- The avatar is drawn in the browser from a handful of part indices (web/src/auth/avatarConfig.ts),
-- not uploaded, so there is nothing to put in a storage bucket and no image to moderate, strip EXIF
-- from, or serve. What has to persist is the recipe: {skin, hair, hairColor, face, wear, extra,
-- frame}. That is a single small jsonb value, so it belongs on the profile row rather than in a
-- table of its own -- there is exactly one per profile, and it is always read with the profile.
--
-- jsonb rather than a column per part: the parts list is expected to grow (more hair, more detail),
-- and each new part would otherwise be another migration against a table every signed-in user
-- reads. The client clamps every field to a valid option on the way in (parseAvatar), so a row
-- written by an older or newer build still renders.
--
-- Nullable with no default: null means "has not chosen yet", which the client renders as the
-- default avatar. Backfilling every existing profile with a default would erase that distinction
-- and make an untouched profile indistinguishable from a deliberate choice.
--
-- No policy changes are needed. public.profiles already has:
--   select using (true)                -- profiles are public; an avatar is meant to be seen
--   update using (id = auth.uid())     -- you may only write your own row
-- and, unlike public.frescoes, profiles has no column-level grants carving up who may write which
-- column, so the new column is covered by the existing update policy the moment it exists.

alter table public.profiles
  add column if not exists avatar jsonb;

comment on column public.profiles.avatar is
  'Avatar part indices drawn by web/src/auth/Avatar.tsx. Null means the artist has not chosen one.';
