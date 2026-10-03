-- Draw This Wall: a fresco can be a response to another fresco.
--
-- The link is a column, not a join table: a response has exactly one source, so a table with a
-- unique response id would be this column with extra steps. It is kept separately from location
-- on purpose -- a neighbourhood-snapped response can land ~550 m from its source and fall out of
-- Same Wall's 50 m radius, and the two are still creatively related.
--
-- Deleting the source sets the link to null; the response is its own artwork and stays.
alter table public.frescoes
  add column if not exists source_fresco_id uuid references public.frescoes (id) on delete set null;
alter table public.frescoes add constraint frescoes_source_not_self
  check (source_fresco_id <> id);

create index if not exists frescoes_source_idx on public.frescoes (source_fresco_id)
  where source_fresco_id is not null;

-- Set once, at save time. No update grant: the relationship is part of how the work was made, so
-- it can't be pointed at a different fresco afterwards.
grant insert (source_fresco_id) on public.frescoes to authenticated;

-- You may only respond to a fresco you can see as public, or to one of your own. Restrictive, so
-- it narrows the existing "insert own frescoes" policy instead of replacing it.
create policy "respond only to a public fresco or your own" on public.frescoes
  as restrictive for insert to authenticated
  with check (
    source_fresco_id is null
    or exists (
      select 1 from public.frescoes s
       where s.id = frescoes.source_fresco_id
         and ((s.visibility = 'public' and s.moderation = 'ok') or s.owner_id = auth.uid())
    )
  );
