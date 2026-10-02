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
-- Added by 0004_friends.sql. No 'declined' value: declining, cancelling and unfriending are all
-- just deleting the row (see the friend_requests policies below), so there is one state machine.
create type public.friend_request_status as enum ('pending', 'accepted');
-- Added by 0006_missions_and_collaborative_frescos.sql.
create type public.mission_type as enum ('global', 'regional', 'radius', 'place', 'fresco');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  -- Avatar part indices, drawn in the browser (web/src/auth/avatarConfig.ts). Null until chosen.
  -- Added by 0003_profile_avatar.sql; see that migration for why it is jsonb on this row.
  avatar       jsonb,
  -- Added by 0004_friends.sql. Assigned once, by handle_new_user, the same moment the profile
  -- exists -- not "chosen", so unlike avatar it is never null. Short and typeable, for sharing
  -- outside a QR: 8 hex characters, not a UUID.
  friend_code  text not null unique,
  created_at   timestamptz not null default now()
);

-- Added by 0004_friends.sql. The relationship itself: pending is sent-not-yet-accepted, accepted
-- is neighbors. Deleting the row (either side, any status) covers cancel, decline and unfriend.
create table public.friend_requests (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status       public.friend_request_status not null default 'pending',
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  -- Order-independent identity for the pair, so A-requests-B and B-requests-A collide into the
  -- same row instead of creating two crossed, contradictory requests.
  pair_key uuid[2] generated always as (
    case when requester_id < addressee_id then array[requester_id, addressee_id]
         else array[addressee_id, requester_id] end
  ) stored,
  check (requester_id <> addressee_id),
  unique (pair_key)
);

create index friend_requests_addressee_idx on public.friend_requests (addressee_id, status);
create index friend_requests_requester_idx on public.friend_requests (requester_id, status);

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
  published_at    timestamptz,
  -- Added by 0005_references_used.sql. Metadata only (title/creator/licence/source link) for any
  -- Openverse reference pinned while drawing -- never the image itself (D-009/ADR-005 already
  -- forbid storing those). Shaped like referencesClient.ts's `Reference`.
  references_used jsonb not null default '[]'::jsonb
    constraint frescoes_references_used_is_array check (jsonb_typeof(references_used) = 'array'),
  -- Added by 0007_draw_this_wall.sql. The fresco this one responds to; set once at save time
  -- (insert grant only). Null when it isn't a response, or once the source is deleted.
  source_fresco_id uuid references public.frescoes (id) on delete set null
    constraint frescoes_source_not_self check (source_fresco_id <> id)
);

-- Added by 0004_friends.sql. Must be one of this artist's own published frescoes -- enforced by
-- profiles_check_favorite_fresco below, not just trusted from the client. Added here rather than
-- inline on `profiles` because it references `frescoes`, which is created after `profiles`.
alter table public.profiles add column favorite_fresco_id uuid
  references public.frescoes (id) on delete set null;

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
create index frescoes_source_idx     on public.frescoes (source_fresco_id)
  where source_fresco_id is not null;

-- Added by 0006_missions_and_collaborative_frescos.sql. Deliberately independent of Draw This Wall
-- and Place Timeline (built in parallel elsewhere): no `places` table -- missions and collaborative
-- frescos carry their own place_name/public_location -- and no columns added to `frescoes` itself.
-- A mission submission or a collaborative layer is just a normal fresco, named from the other side
-- via a join table.
create table public.missions (
  id                        uuid primary key default gen_random_uuid(),
  title                     text not null check (char_length(title) between 1 and 120),
  prompt                    text not null check (char_length(prompt) between 1 and 1000),
  description               text check (char_length(description) <= 2000),
  mission_type              public.mission_type not null,
  -- Text, not an enum -- "should eventually become an enum if mission lifecycle stabilizes".
  status                    text not null default 'draft'
                              check (status in ('draft', 'active', 'closed', 'archived')),
  starts_at                 timestamptz,
  ends_at                   timestamptz,
  -- Public-safe only: never derived from anyone's owner-only exact location.
  public_location           extensions.geography(Point, 4326),
  radius_meters             integer check (radius_meters is null or radius_meters > 0),
  place_name                text check (char_length(place_name) <= 200),
  target_fresco_id          uuid references public.frescoes (id) on delete set null,
  max_submissions_per_user  integer check (max_submissions_per_user is null or max_submissions_per_user > 0),
  -- Null means system/seed-created: mission creation is admin/seed-only for the MVP.
  created_by                uuid references public.profiles (id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index missions_status_idx on public.missions (status, starts_at);
create index missions_location_idx on public.missions using gist (public_location)
  where public_location is not null;

create table public.mission_submissions (
  mission_id    uuid not null references public.missions (id) on delete cascade,
  -- One fresco answers at most one mission -- the source of truth for mission participation.
  fresco_id     uuid not null unique references public.frescoes (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  submitted_at  timestamptz not null default now(),
  primary key (mission_id, user_id, fresco_id)
);

create index mission_submissions_mission_idx on public.mission_submissions (mission_id, submitted_at desc);
create index mission_submissions_user_idx on public.mission_submissions (user_id);

create table public.collaborative_frescos (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  mission_id    uuid references public.missions (id) on delete set null,
  title         text not null check (char_length(title) between 1 and 120),
  description   text check (char_length(description) <= 2000),
  place_name    text check (char_length(place_name) <= 200),
  public_location extensions.geography(Point, 4326),
  -- MVP reduces the draft/open/closed/archived lifecycle to open/closed.
  status        text not null default 'open' check (status in ('open', 'closed')),
  visibility    public.fresco_visibility not null default 'private',
  -- "Start with invite-only to reduce abuse and synchronization complexity", configurable per fresco.
  invite_only   boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index collaborative_frescos_owner_idx on public.collaborative_frescos (owner_id);
create index collaborative_frescos_mission_idx on public.collaborative_frescos (mission_id)
  where mission_id is not null;

create table public.collaborative_fresco_invitations (
  id                      uuid primary key default gen_random_uuid(),
  collaborative_fresco_id uuid not null references public.collaborative_frescos (id) on delete cascade,
  invitee_id              uuid not null references public.profiles (id) on delete cascade,
  invited_by              uuid not null references public.profiles (id) on delete cascade,
  created_at              timestamptz not null default now(),
  unique (collaborative_fresco_id, invitee_id)
);

create table public.collaborative_fresco_contributions (
  id                      uuid primary key default gen_random_uuid(),
  collaborative_fresco_id uuid not null references public.collaborative_frescos (id) on delete cascade,
  -- A contribution IS a fresco -- one fresco is at most one layer, in at most one collaborative fresco.
  fresco_id               uuid not null unique references public.frescoes (id) on delete cascade,
  contributor_id          uuid not null references public.profiles (id) on delete cascade,
  label                   text check (char_length(label) <= 80),
  layer_order             integer not null default 0,
  created_at              timestamptz not null default now()
);

create index collaborative_fresco_contributions_parent_idx
  on public.collaborative_fresco_contributions (collaborative_fresco_id, layer_order);

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

-- Added by 0004_friends.sql. 8 uppercase hex characters: easy to read aloud or type by hand, and
-- at 16^8 combinations collisions are rare enough that the retry loop below is a formality.
create or replace function public.generate_friend_code()
returns text
language sql
volatile
as $$
  select upper(substr(md5(gen_random_uuid()::text), 1, 8));
$$;

-- Create a profile row for every new auth user, with a friend_code assigned the same moment --
-- not "chosen", so it is never null (0004_friends.sql).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  loop
    v_code := public.generate_friend_code();
    exit when not exists (select 1 from public.profiles where friend_code = v_code);
  end loop;
  insert into public.profiles (id, display_name, friend_code)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'name', 40), 'Artist'), v_code);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Added by 0004_friends.sql. A favorite has to be your own, published, unflagged work -- it is
-- shown beside your globe to anyone who can see that globe, so it is held to the same bar as
-- anything else there. Enforced here, not just trusted from the client.
create or replace function public.profiles_check_favorite_fresco()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.favorite_fresco_id is not null and not exists (
    select 1 from public.frescoes f
     where f.id = new.favorite_fresco_id
       and f.owner_id = new.id
       and f.visibility = 'public'
       and f.moderation = 'ok'
  ) then
    raise exception 'favorite_fresco_id must be one of your own published frescoes';
  end if;
  return new;
end;
$$;

create trigger profiles_check_favorite_fresco
  before insert or update of favorite_fresco_id on public.profiles
  for each row execute function public.profiles_check_favorite_fresco();

-- Added by 0004_friends.sql. If a favorited fresco is later unpublished or flagged, it stops
-- qualifying -- clear the pointer rather than leave a favorite silently referencing something
-- that no longer passes the check above.
create or replace function public.frescoes_clear_favorite_if_unpublished()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.visibility <> 'public' or new.moderation <> 'ok') then
    update public.profiles set favorite_fresco_id = null where favorite_fresco_id = new.id;
  end if;
  return null;
end;
$$;

create trigger frescoes_clear_favorite_if_unpublished
  after update of visibility, moderation on public.frescoes
  for each row execute function public.frescoes_clear_favorite_if_unpublished();

-- Added by 0006_missions_and_collaborative_frescos.sql.
create trigger missions_touch before update on public.missions
  for each row execute function public.touch_updated_at();
create trigger collaborative_frescos_touch before update on public.collaborative_frescos
  for each row execute function public.touch_updated_at();

-- The one way to create a mission submission (do not trust mission eligibility values supplied by
-- the browser -- every check below runs server-side, against data the caller cannot forge), the
-- same security-definer pattern as handle_new_user/reports_after_insert above.
create or replace function public.submit_mission_fresco(p_mission_id uuid, p_fresco_id uuid)
returns public.mission_submissions
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_mission     public.missions;
  v_fresco      public.frescoes;
  v_existing    int;
  v_result      public.mission_submissions;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  select * into v_fresco from public.frescoes where id = p_fresco_id;
  if v_fresco is null or v_fresco.owner_id <> auth.uid() then
    raise exception 'You can only submit your own fresco';
  end if;

  select * into v_mission from public.missions where id = p_mission_id;
  if v_mission is null or v_mission.status <> 'active' then
    raise exception 'This mission is not open for submissions';
  end if;
  if v_mission.starts_at is not null and now() < v_mission.starts_at then
    raise exception 'This mission has not started yet';
  end if;
  if v_mission.ends_at is not null and now() > v_mission.ends_at then
    raise exception 'This mission has ended';
  end if;

  -- Uses the fresco's own public_location: public-safe only, never the owner-only exact point.
  if v_mission.public_location is not null and v_mission.radius_meters is not null then
    if v_fresco.public_location is null
       or not extensions.st_dwithin(v_fresco.public_location, v_mission.public_location, v_mission.radius_meters)
    then
      raise exception 'That fresco is outside this mission''s area';
    end if;
  end if;

  if v_mission.max_submissions_per_user is not null then
    select count(*) into v_existing
      from public.mission_submissions
     where mission_id = p_mission_id and user_id = auth.uid();
    if v_existing >= v_mission.max_submissions_per_user then
      raise exception 'You''ve already reached this mission''s submission limit';
    end if;
  end if;

  insert into public.mission_submissions (mission_id, fresco_id, user_id)
  values (p_mission_id, p_fresco_id, auth.uid())
  returning * into v_result;

  return v_result;
end;
$$;

-- The one way to add a layer: a contributor creates their own layer through the normal drawing
-- flow, and nobody can create one on someone else's behalf. The fresco itself is always owned by
-- whoever drew it -- this function only records that it's also a layer.
create or replace function public.add_collaborative_contribution(
  p_collaborative_fresco_id uuid,
  p_fresco_id uuid,
  p_label text default null
)
returns public.collaborative_fresco_contributions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cf        public.collaborative_frescos;
  v_fresco    public.frescoes;
  v_invited   boolean;
  v_next      integer;
  v_result    public.collaborative_fresco_contributions;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  select * into v_fresco from public.frescoes where id = p_fresco_id;
  if v_fresco is null or v_fresco.owner_id <> auth.uid() then
    raise exception 'You can only contribute your own fresco';
  end if;

  select * into v_cf from public.collaborative_frescos where id = p_collaborative_fresco_id;
  if v_cf is null then
    raise exception 'Collaborative fresco not found';
  end if;
  if v_cf.status <> 'open' then
    raise exception 'This collaborative fresco is closed to new contributions';
  end if;

  if v_cf.invite_only and v_cf.owner_id <> auth.uid() then
    select exists (
      select 1 from public.collaborative_fresco_invitations
       where collaborative_fresco_id = p_collaborative_fresco_id and invitee_id = auth.uid()
    ) into v_invited;
    if not v_invited then
      raise exception 'You need an invitation to contribute to this collaborative fresco';
    end if;
  end if;

  select coalesce(max(layer_order), -1) + 1 into v_next
    from public.collaborative_fresco_contributions
   where collaborative_fresco_id = p_collaborative_fresco_id;

  insert into public.collaborative_fresco_contributions
    (collaborative_fresco_id, fresco_id, contributor_id, label, layer_order)
  values (p_collaborative_fresco_id, p_fresco_id, auth.uid(), p_label, v_next)
  returning * into v_result;

  return v_result;
end;
$$;

-- collaborative_frescos' own SELECT policy needs to check invitations and contributions; those two
-- tables' policies need to check collaborative_frescos back. Doing that with a plain subquery on
-- both sides makes Postgres's RLS planner detect a genuine cycle ("infinite recursion detected in
-- policy for relation"). These two helpers break it the same way profiles_check_favorite_fresco /
-- reports_after_insert already do: security definer, so the lookup inside bypasses RLS entirely
-- instead of re-entering it.
create or replace function public.owns_collaborative_fresco(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.collaborative_frescos cf where cf.id = p_id and cf.owner_id = auth.uid()
  );
$$;

create or replace function public.collaborative_fresco_is_public(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.collaborative_frescos cf where cf.id = p_id and cf.visibility = 'public'
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.frescoes         enable row level security;
alter table public.fresco_locations enable row level security;
alter table public.reports          enable row level security;
alter table public.friend_requests  enable row level security;

create policy "profiles are readable by anyone" on public.profiles
  for select using (true);
create policy "users update their own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "see your own friend requests" on public.friend_requests
  for select using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "send a friend request" on public.friend_requests
  for insert with check (requester_id = auth.uid());
-- Only the addressee can move a pending request to accepted; there is no "decline" status --
-- declining just deletes the row, below.
create policy "addressee accepts a pending request" on public.friend_requests
  for update using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status = 'accepted');
-- Covers cancel (requester deletes a pending row), decline (addressee deletes a pending row) and
-- unfriend (either side deletes an accepted row) with one policy and no extra status values.
create policy "either side removes a friend request" on public.friend_requests
  for delete using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "read own or public frescoes" on public.frescoes
  for select using (
    owner_id = auth.uid()
    or (visibility = 'public' and moderation = 'ok')
  );
create policy "insert own frescoes" on public.frescoes
  for insert with check (owner_id = auth.uid());
-- Added by 0007_draw_this_wall.sql. A response may only name a fresco you can see as public, or
-- one of your own. Restrictive, so it narrows the policy above instead of widening it.
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
create policy "update own frescoes" on public.frescoes
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "delete own frescoes" on public.frescoes
  for delete using (owner_id = auth.uid());

-- Owners may not touch moderation, report counts or the derived location.
revoke update on public.frescoes from anon, authenticated;
grant update (title, caption, memory, tags, visibility, pin_precision, place_name, references_used)
  on public.frescoes to authenticated;
revoke insert on public.frescoes from anon, authenticated;
grant insert (id, owner_id, title, caption, memory, tags, visibility, pin_precision, place_name,
              captured_at, width, height, photo_path, drawing_path, composite_path, thumb_path,
              references_used, source_fresco_id)
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

-- Added by 0006_missions_and_collaborative_frescos.sql.
alter table public.missions                            enable row level security;
alter table public.mission_submissions                 enable row level security;
alter table public.collaborative_frescos                enable row level security;
alter table public.collaborative_fresco_invitations     enable row level security;
alter table public.collaborative_fresco_contributions   enable row level security;

create policy "missions are readable once not a draft" on public.missions
  for select using (status <> 'draft' or created_by = auth.uid());
-- No insert/update/delete policy for 'authenticated': MVP mission creation is admin/seed-only
-- (service_role bypasses RLS already).

create policy "see your own submissions, or anyone's public one" on public.mission_submissions
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.frescoes f
       where f.id = fresco_id and f.visibility = 'public' and f.moderation = 'ok'
    )
  );
-- No insert/update/delete policy: submit_mission_fresco() above is the only way in.

create policy "see public collaborative frescos, your own, or ones you're part of"
  on public.collaborative_frescos
  for select using (
    visibility = 'public'
    or owner_id = auth.uid()
    or exists (
      select 1 from public.collaborative_fresco_invitations i
       where i.collaborative_fresco_id = id and i.invitee_id = auth.uid()
    )
    or exists (
      select 1 from public.collaborative_fresco_contributions c
       where c.collaborative_fresco_id = id and c.contributor_id = auth.uid()
    )
  );
create policy "create your own collaborative fresco" on public.collaborative_frescos
  for insert with check (owner_id = auth.uid());
create policy "owner edits their collaborative fresco" on public.collaborative_frescos
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner deletes their collaborative fresco" on public.collaborative_frescos
  for delete using (owner_id = auth.uid());
revoke update on public.collaborative_frescos from anon, authenticated;
grant update (title, description, place_name, public_location, status, visibility, invite_only)
  on public.collaborative_frescos to authenticated;
revoke insert on public.collaborative_frescos from anon, authenticated;
grant insert (id, owner_id, mission_id, title, description, place_name, public_location,
              visibility, invite_only)
  on public.collaborative_frescos to authenticated;

create policy "see invitations sent to you or by you" on public.collaborative_fresco_invitations
  for select using (invited_by = auth.uid() or invitee_id = auth.uid());
create policy "the organizer invites people" on public.collaborative_fresco_invitations
  for insert with check (invited_by = auth.uid() and public.owns_collaborative_fresco(collaborative_fresco_id));
create policy "organizer revokes, or invitee declines" on public.collaborative_fresco_invitations
  for delete using (invited_by = auth.uid() or invitee_id = auth.uid());

create policy "see contributions you can see the parent for" on public.collaborative_fresco_contributions
  for select using (
    contributor_id = auth.uid()
    or public.owns_collaborative_fresco(collaborative_fresco_id)
    or (
      public.collaborative_fresco_is_public(collaborative_fresco_id)
      and exists (
        select 1 from public.frescoes f
         where f.id = fresco_id and f.visibility = 'public' and f.moderation = 'ok'
      )
    )
  );
-- No insert policy: add_collaborative_contribution() above is the only way in.
create policy "organizer reorders layers" on public.collaborative_fresco_contributions
  for update using (public.owns_collaborative_fresco(collaborative_fresco_id));
revoke update on public.collaborative_fresco_contributions from anon, authenticated;
grant update (layer_order) on public.collaborative_fresco_contributions to authenticated;
create policy "contributor or organizer removes a layer" on public.collaborative_fresco_contributions
  for delete using (contributor_id = auth.uid() or public.owns_collaborative_fresco(collaborative_fresco_id));

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

-- Added by 0006_missions_and_collaborative_frescos.sql. No stored/denormalized counter to drift.
create or replace function public.mission_stats(p_mission_id uuid)
returns table (participant_count bigint, fresco_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select count(distinct user_id), count(distinct fresco_id)
    from public.mission_submissions
   where mission_id = p_mission_id;
$$;

-- Added by 0008_place_history.sql. Place History: public frescoes around a point (public_location
-- only), newest first by when the place was seen, plus a summary. See the migration for why.
create or replace function public.place_timeline(
  p_lng double precision,
  p_lat double precision,
  p_radius_m int default 250,
  p_year int default null,
  -- Keyset cursor: the seen_at and id of the last row already shown.
  p_before_seen timestamptz default null,
  p_before_id uuid default null,
  p_limit int default 24
)
returns table (
  id uuid, title text, thumb_path text, composite_path text, owner_id uuid, artist text,
  seen_at timestamptz, seen_year int,
  source_fresco_id uuid, source_title text, source_artist text
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with here as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as g
  ), nearby as (
    select f.*, coalesce(f.captured_at, f.created_at) as seen
      from here
      cross join public.frescoes f
     where f.visibility = 'public' and f.moderation = 'ok'
       and extensions.st_dwithin(f.public_location, here.g, least(greatest(p_radius_m, 10), 1000))
  )
  select n.id, n.title, n.thumb_path, n.composite_path, n.owner_id, p.display_name,
         n.seen, extract(year from n.seen at time zone 'UTC')::int,
         n.source_fresco_id, s.title, sp.display_name
    from nearby n
    join public.profiles p on p.id = n.owner_id
    -- Draw This Wall credit; only a source that is itself public shows by name.
    left join public.frescoes s
      on s.id = n.source_fresco_id and s.visibility = 'public' and s.moderation = 'ok'
    left join public.profiles sp on sp.id = s.owner_id
   where (p_year is null or extract(year from n.seen at time zone 'UTC')::int = p_year)
     and (p_before_seen is null or (n.seen, n.id) < (p_before_seen, p_before_id))
   order by n.seen desc, n.id desc
   limit least(greatest(p_limit, 1), 100);
$$;

create or replace function public.place_summary(
  p_lng double precision,
  p_lat double precision,
  p_radius_m int default 250
)
returns table (
  fresco_count int, artist_count int, earliest timestamptz, latest timestamptz,
  place_name text, years int[]
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with here as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as g
  ), nearby as (
    select f.owner_id, f.place_name, coalesce(f.captured_at, f.created_at) as seen
      from here
      cross join public.frescoes f
     where f.visibility = 'public' and f.moderation = 'ok'
       and extensions.st_dwithin(f.public_location, here.g, least(greatest(p_radius_m, 10), 1000))
  )
  select count(*)::int,
         count(distinct owner_id)::int,
         min(seen),
         max(seen),
         -- The name most artists gave it: an approximate place name, nulls ignored.
         mode() within group (order by place_name),
         coalesce(
           array_agg(distinct extract(year from seen at time zone 'UTC')::int
                     order by extract(year from seen at time zone 'UTC')::int desc),
           '{}'
         )
    from nearby;
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
