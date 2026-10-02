-- Records which Openverse reference images an artist leaned on while drawing a fresco.
--
-- D-009/ADR-005 already forbid storing the reference images themselves; this stores only the
-- small bit of metadata (title, creator, licence, source link) a traced CC BY-SA-style reference
-- can carry an attribution duty for. It travels with whatever was pinned in the draft
-- (web/src/references/PinnedReference.tsx) at Finish time, same shape as `Reference` in
-- referencesClient.ts, so no lookup against Openverse is needed to show it later.
alter table public.frescoes add column if not exists references_used jsonb not null default '[]'::jsonb;
alter table public.frescoes add constraint frescoes_references_used_is_array
  check (jsonb_typeof(references_used) = 'array');

-- Owners can both set it at Finish time and clear/edit it afterwards, same as the other
-- owner-editable fields; it is never written by anyone but the owner (RLS below is unchanged).
grant update (references_used) on public.frescoes to authenticated;
grant insert (references_used) on public.frescoes to authenticated;
