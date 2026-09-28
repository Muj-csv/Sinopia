-- Sinopia: Supabase schema, Row Level Security and storage policies
-- Reference migration for Phase 0. Copy to supabase/migrations/0001_init.sql.
-- Target: Supabase (Postgres 15+). PostGIS lives in the `extensions` schema, as Supabase installs it.

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.fresco_visibility as enum ('private', 'public');
create type public.pin_precision     as enum ('exact', 'neighborhood');
create type public.moderation_state  as enum ('ok', 'flagged', 'removed');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at   timestamptz not null default now()
);

create table public.frescoes (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles (id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 80),
  caption         text check (char_length(caption) <= 500),
  memory          text check (char_length(memory) <= 1000),
  tags            text[] not null default '{}',
  visibility      public.fresco_visibility not null default 'private',
  pin_precision   public.pin_precision not null default 'neighborhood',
  -- Public-safe point. Set only by the trigger below; null while private.
  public_location extensions.geography(Point, 4326),
  place_name      text check (char_length(place_name) <= 200),
  captured_at     timestamptz,
  width           int check (width between 1 and 4096),
  height          int check (height between 1 and 4096),
  -- Storage object paths inside the bucket, e.g. '<owner>/<fresco>/composite.webp'
  photo_path      text not null,
  drawing_path    text not null,
  composite_path  text not null,
  thumb_path      text not null,
  moderation      public.moderation_state not null default 'ok',
  report_count    int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  published_at    timestamptz
);

-- Exact GPS lives in its own owner-only table. RLS is row-level, not column-level:
-- keeping the exact point out of `frescoes` means a public row can never leak it.
create table public.fresco_locations (
  fresco_id uuid primary key references public.frescoes (id) on delete cascade,
  owner_id  uuid not null references public.profiles (id) on delete cascade,
  location  extensions.geography(Point, 4326) not null
);

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  fresco_id   uuid not null references public.frescoes (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason      text check (char_length(reason) <= 300),
  created_at  timestamptz not null default now(),
  unique (fresco_id, reporter_id)
);

create index frescoes_owner_idx      on public.frescoes (owner_id, created_at desc);
create index frescoes_public_loc_idx on public.frescoes using gist (public_location)
  where visibility = 'public' and moderation = 'ok';

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Keep public_location in sync with visibility, precision and the exact point.
-- 'neighborhood' snaps to a 0.005° grid (~550 m north-south).
create or replace function public.sync_public_location(p_fresco uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_vis  public.fresco_visibility;
  v_prec public.pin_precision;
  v_loc  extensions.geography;
begin
  select f.visibility, f.pin_precision into v_vis, v_prec
    from public.frescoes f where f.id = p_fresco;
  select l.location into v_loc from public.fresco_locations l where l.fresco_id = p_fresco;

  update public.frescoes f set
    public_location = case
      when v_vis <> 'public' or v_loc is null then null
      when v_prec = 'exact' then v_loc
      else extensions.st_snaptogrid(v_loc::extensions.geometry, 0.005)::extensions.geography
    end,
    published_at = case
      when v_vis = 'public' then coalesce(f.published_at, now())
      else null
    end
  where f.id = p_fresco;
end;
$$;

create or replace function public.frescoes_after_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.visibility is distinct from old.visibility
     or new.pin_precision is distinct from old.pin_precision then
    perform public.sync_public_location(new.id);
  end if;
  return null;
end;
$$;

create trigger frescoes_after_write
  after insert or update of visibility, pin_precision on public.frescoes
  for each row execute function public.frescoes_after_write();

create or replace function public.locations_after_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_public_location(new.fresco_id);
  return null;
end;
$$;

create trigger locations_after_write
  after insert or update on public.fresco_locations
  for each row execute function public.locations_after_write();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

create trigger frescoes_touch before update on public.frescoes
  for each row execute function public.touch_updated_at();

-- One report hides a fresco from the globe until the team reviews it (hackathon policy, D-010).
create or replace function public.reports_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.frescoes
     set report_count = report_count + 1,
         moderation = case when moderation = 'ok' then 'flagged'::public.moderation_state else moderation end
   where id = new.fresco_id;
  return null;
end;
$$;

create trigger reports_after_insert after insert on public.reports
  for each row execute function public.reports_after_insert();

-- Create a profile row for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'name', 40), 'Artist'));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.frescoes         enable row level security;
alter table public.fresco_locations enable row level security;
alter table public.reports          enable row level security;

create policy "profiles are readable by anyone" on public.profiles
  for select using (true);
create policy "users update their own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "read own or public frescoes" on public.frescoes
  for select using (
    owner_id = auth.uid()
    or (visibility = 'public' and moderation = 'ok')
  );
create policy "insert own frescoes" on public.frescoes
  for insert with check (owner_id = auth.uid());
create policy "update own frescoes" on public.frescoes
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "delete own frescoes" on public.frescoes
  for delete using (owner_id = auth.uid());

-- Owners may not touch moderation, report counts or the derived location.
revoke update on public.frescoes from anon, authenticated;
grant update (title, caption, memory, tags, visibility, pin_precision, place_name)
  on public.frescoes to authenticated;
revoke insert on public.frescoes from anon, authenticated;
grant insert (id, owner_id, title, caption, memory, tags, visibility, pin_precision, place_name,
              captured_at, width, height, photo_path, drawing_path, composite_path, thumb_path)
  on public.frescoes to authenticated;

create policy "owner reads own exact location" on public.fresco_locations
  for select using (owner_id = auth.uid());
create policy "owner inserts own exact location" on public.fresco_locations
  for insert with check (
    owner_id = auth.uid()
    and exists (select 1 from public.frescoes f where f.id = fresco_id and f.owner_id = auth.uid())
  );
create policy "owner updates own exact location" on public.fresco_locations
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "signed-in users report public frescoes" on public.reports
  for insert with check (
    reporter_id = auth.uid()
    and exists (select 1 from public.frescoes f
                where f.id = fresco_id and f.visibility = 'public' and f.owner_id <> auth.uid())
  );
-- No select policy on reports: only the team (service role / dashboard) reads them.

-- ---------------------------------------------------------------------------
-- Read functions (security invoker: RLS still applies)
-- ---------------------------------------------------------------------------
create or replace function public.globe_points(p_limit int default 5000)
returns table (id uuid, title text, thumb_path text, owner_id uuid, lng double precision, lat double precision)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select f.id, f.title, f.thumb_path, f.owner_id,
         extensions.st_x(f.public_location::extensions.geometry),
         extensions.st_y(f.public_location::extensions.geometry)
    from public.frescoes f
   where f.visibility = 'public' and f.moderation = 'ok' and f.public_location is not null
   order by f.published_at desc
   limit least(p_limit, 5000);
$$;

create or replace function public.same_wall(p_fresco uuid, p_radius_m int default 50)
returns table (id uuid, title text, thumb_path text, owner_id uuid, distance_m double precision)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select f.id, f.title, f.thumb_path, f.owner_id,
         extensions.st_distance(f.public_location, c.public_location)
    from public.frescoes c
    join public.frescoes f
      on f.id <> c.id
     and f.visibility = 'public' and f.moderation = 'ok'
     and extensions.st_dwithin(f.public_location, c.public_location, least(greatest(p_radius_m, 10), 1000))
   where c.id = p_fresco and c.public_location is not null
   order by 5
   limit 24;
$$;

-- ---------------------------------------------------------------------------
-- Storage: two buckets. Paths are '<owner_id>/<fresco_id>/<file>.webp'.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('sketchbook', 'sketchbook', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('globe', 'globe', true)
  on conflict (id) do nothing;

create policy "owner manages own sketchbook files" on storage.objects
  for all to authenticated
  using (bucket_id = 'sketchbook' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'sketchbook' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owner writes own globe files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'globe' and (storage.foldername(name))[1] = auth.uid()::text);
-- Publishing uploads with upsert = INSERT ... ON CONFLICT DO UPDATE, which needs to SELECT the row
-- it might conflict with and UPDATE it if it does. With INSERT alone every publish was rejected.
-- These are owner-scoped; public read of published images is served from the public bucket URL and
-- never consults these policies.
create policy "owner reads own globe files" on storage.objects
  for select to authenticated
  using (bucket_id = 'globe' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner updates own globe files" on storage.objects
  for update to authenticated
  using (bucket_id = 'globe' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'globe' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner deletes own globe files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'globe' and (storage.foldername(name))[1] = auth.uid()::text);
-- Public read on 'globe' comes from the bucket being public.
