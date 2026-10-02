-- Sketch Missions and Collaborative Fresco (Sinopia_Feature_Expansion_PRD.md, features 3 and 4).
--
-- Deliberately independent of the other two features in that PRD (Draw This Wall, Place Timeline),
-- which are being built in parallel elsewhere: no `places` table (missions and collaborative
-- frescos carry their own place_name/public_location instead of a places.id FK -- the PRD itself
-- allows this: "Decide whether explicit places are required for MVP or can initially be derived"),
-- and no columns added to `frescoes` (a contribution or a submission is just a normal fresco, named
-- from the other side via a join table -- `mission_submissions` / `collaborative_fresco_contributions`
-- -- exactly as the PRD's own recommended schema does). A fresco never needs to know it's part of
-- either feature.
--
-- Every privileged write (submitting to a mission, adding a layer to a collaborative fresco) goes
-- through a security-definer function rather than a plain RLS insert policy, the same pattern this
-- schema already uses for handle_new_user/sync_public_location/reports_after_insert: the validation
-- (ownership, time window, radius, submission limits, invite status, open/closed state) is too
-- stateful for a declarative policy to express safely.

-- ---------------------------------------------------------------------------
-- Sketch Missions
-- ---------------------------------------------------------------------------
create type public.mission_type as enum ('global', 'regional', 'radius', 'place', 'fresco');

create table public.missions (
  id                        uuid primary key default gen_random_uuid(),
  title                     text not null check (char_length(title) between 1 and 120),
  prompt                    text not null check (char_length(prompt) between 1 and 1000),
  description               text check (char_length(description) <= 2000),
  mission_type              public.mission_type not null,
  -- Text, not an enum -- "status should eventually become an enum if mission lifecycle stabilizes"
  -- (PRD §14.5). Checked against a fixed set in the meantime.
  status                    text not null default 'draft'
                              check (status in ('draft', 'active', 'closed', 'archived')),
  starts_at                 timestamptz,
  ends_at                   timestamptz,
  -- Public-safe only: a mission's centre is never derived from anyone's owner-only exact location.
  public_location           extensions.geography(Point, 4326),
  radius_meters             integer check (radius_meters is null or radius_meters > 0),
  place_name                text check (char_length(place_name) <= 200),
  target_fresco_id          uuid references public.frescoes (id) on delete set null,
  max_submissions_per_user  integer check (max_submissions_per_user is null or max_submissions_per_user > 0),
  -- Null means system/seed-created, matching "Mission creation: admins or seed data for the MVP".
  created_by                uuid references public.profiles (id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index missions_status_idx on public.missions (status, starts_at);
create index missions_location_idx on public.missions using gist (public_location)
  where public_location is not null;

create trigger missions_touch before update on public.missions
  for each row execute function public.touch_updated_at();

create table public.mission_submissions (
  mission_id    uuid not null references public.missions (id) on delete cascade,
  -- One fresco answers at most one mission -- this is what "source of truth for mission
  -- participation" (PRD §14.6) means: a fresco either is a submission or it isn't.
  fresco_id     uuid not null unique references public.frescoes (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  submitted_at  timestamptz not null default now(),
  primary key (mission_id, user_id, fresco_id)
);

create index mission_submissions_mission_idx on public.mission_submissions (mission_id, submitted_at desc);
create index mission_submissions_user_idx on public.mission_submissions (user_id);

-- The one way to create a submission (SEC-06: "do not trust mission eligibility values supplied by
-- the browser" -- every check below runs server-side, against data the caller cannot forge).
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

  -- Radius check uses the fresco's own public_location (G-01/G-02: public-safe only, never the
  -- owner-only exact point) and only applies when the mission actually has a centre and radius.
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

-- Read-only aggregate, the same shape same_wall()/globe_points() already use: security invoker
-- (RLS on the underlying tables still applies), no stored/denormalized counter to drift.
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

alter table public.missions enable row level security;
alter table public.mission_submissions enable row level security;

-- Anyone can browse missions that aren't drafts; a draft is visible only to whoever is building it.
create policy "missions are readable once not a draft" on public.missions
  for select using (status <> 'draft' or created_by = auth.uid());
-- No insert/update/delete policy for 'authenticated': MVP mission creation is admin/seed-only
-- (service_role bypasses RLS already), matching "Mission creation can be administrative or seeded
-- rather than fully user-generated... recommended for initial launch to reduce moderation
-- complexity" (PRD §10.5).

-- A submission is visible to whoever made it, and to anyone once the underlying fresco is public
-- and not moderated away -- "Mission submissions appear in the mission's public gallery when
-- public" (SM-FR-10), without a second, parallel visibility flag to keep in sync with the fresco's.
create policy "see your own submissions, or anyone's public one" on public.mission_submissions
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.frescoes f
       where f.id = fresco_id and f.visibility = 'public' and f.moderation = 'ok'
    )
  );
-- No insert/update/delete policy: submit_mission_fresco() is the only way in, and there is no
-- "withdraw a submission" requirement in the MVP scope.

-- ---------------------------------------------------------------------------
-- Collaborative Fresco
-- ---------------------------------------------------------------------------
create table public.collaborative_frescos (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  -- Optional: "a mission can optionally conclude with a collaborative fresco" (PRD §12.3).
  mission_id    uuid references public.missions (id) on delete set null,
  title         text not null check (char_length(title) between 1 and 120),
  description   text check (char_length(description) <= 2000),
  place_name    text check (char_length(place_name) <= 200),
  -- Public-safe only, same reasoning as missions.public_location above (CF-FR-02).
  public_location extensions.geography(Point, 4326),
  -- MVP reduces the draft/open/closed/archived lifecycle to open/closed (PRD §11.4 CF-FR-10).
  status        text not null default 'open' check (status in ('open', 'closed')),
  visibility    public.fresco_visibility not null default 'private',
  -- CF-FR-11: "MVP recommendation: start with invite-only to reduce abuse and synchronization
  -- complexity." Configurable per-fresco rather than hard-coded, since the PRD frames it as a
  -- setting the owner controls, not a fixed policy.
  invite_only   boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index collaborative_frescos_owner_idx on public.collaborative_frescos (owner_id);
create index collaborative_frescos_mission_idx on public.collaborative_frescos (mission_id)
  where mission_id is not null;

create trigger collaborative_frescos_touch before update on public.collaborative_frescos
  for each row execute function public.touch_updated_at();

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
  -- A contribution IS a fresco -- "each contribution should correspond to an otherwise normal
  -- fresco so existing rendering, ownership, storage, and moderation infrastructure can be reused"
  -- (PRD §14.8) -- so one fresco is at most one layer, in at most one collaborative fresco.
  fresco_id               uuid not null unique references public.frescoes (id) on delete cascade,
  contributor_id          uuid not null references public.profiles (id) on delete cascade,
  label                   text check (char_length(label) <= 80),
  layer_order             integer not null default 0,
  created_at              timestamptz not null default now()
);

create index collaborative_fresco_contributions_parent_idx
  on public.collaborative_fresco_contributions (collaborative_fresco_id, layer_order);

-- The one way to add a layer (CF-FR-04/07: a contributor creates their own layer through the
-- normal drawing flow; nobody can create one on someone else's behalf, and the fresco itself is
-- always owned by whoever drew it -- this function only records that it's also a layer).
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

-- collaborative_frescos' own SELECT policy (below) needs to check invitations and contributions;
-- those two tables' policies need to check collaborative_frescos back (ownership, visibility).
-- Doing that with a plain `exists (select 1 from collaborative_frescos ...)` on both sides makes
-- Postgres's RLS planner detect a genuine cycle -- "infinite recursion detected in policy for
-- relation" -- because evaluating one table's policy re-triggers the other's, which re-triggers the
-- first's, with no memoization across that boundary. These two helpers break the cycle the same way
-- profiles_check_favorite_fresco/reports_after_insert already do: security definer, owned by the
-- role that owns the tables, so the lookup inside bypasses RLS entirely instead of re-entering it.
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

alter table public.collaborative_frescos enable row level security;
alter table public.collaborative_fresco_invitations enable row level security;
alter table public.collaborative_fresco_contributions enable row level security;

create policy "see public collaborative frescos, your own, or ones you're part of"
  on public.collaborative_frescos
  for select using (
    visibility = 'public'
    or owner_id = auth.uid()
    -- Safe to query directly: neither invitations' nor contributions' SELECT policy (below)
    -- references collaborative_frescos through a plain subquery, only through the two functions
    -- above, so this direction of the relationship never re-enters this policy.
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
-- Owners may not quietly swap in someone else's work as the owner, or change who made it.
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
-- Covers the organizer revoking an invitation and the invitee declining one, with one policy.
create policy "organizer revokes, or invitee declines" on public.collaborative_fresco_invitations
  for delete using (invited_by = auth.uid() or invitee_id = auth.uid());

-- A contribution is visible under the same rule as its parent collaborative fresco, further
-- narrowed by the contribution's own underlying fresco: a moderated-away fresco disappears from
-- public view here exactly as it would anywhere else (SEC-09), but the contributor/owner can still
-- see it to know what happened.
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
-- No insert policy: add_collaborative_contribution() is the only way in.
-- CF-FR-06: only the organizer reorders layers.
create policy "organizer reorders layers" on public.collaborative_fresco_contributions
  for update using (public.owns_collaborative_fresco(collaborative_fresco_id));
revoke update on public.collaborative_fresco_contributions from anon, authenticated;
grant update (layer_order) on public.collaborative_fresco_contributions to authenticated;
-- CF-FR-08: a contributor removes their own layer; the organizer removes one for moderation.
create policy "contributor or organizer removes a layer" on public.collaborative_fresco_contributions
  for delete using (contributor_id = auth.uid() or public.owns_collaborative_fresco(collaborative_fresco_id));

-- ---------------------------------------------------------------------------
-- Demo seed data (docs/SETUP.md-style: harmless to run twice, nothing here is a secret).
-- "The demo should make the four features visible even when the live community is small" (PRD §25).
-- ---------------------------------------------------------------------------
-- INSERT ... ON CONFLICT needs a real conflict target, and `id` is a random uuid that never
-- collides between runs -- a `where not exists` per row is what actually makes this idempotent.
insert into public.missions (title, prompt, description, mission_type, status, starts_at, ends_at)
select 'Something Ordinary', 'Find something people normally walk past and give it your attention.',
   'No landmark required -- a doorway, a drainpipe, a parked bike. Draw whatever you''d otherwise never look at twice.',
   'global', 'active', now(), now() + interval '30 days'
where not exists (select 1 from public.missions where title = 'Something Ordinary');

insert into public.missions (title, prompt, description, mission_type, status, starts_at, ends_at)
select 'Draw Your Neighborhood', 'Draw something only your neighborhood would understand.',
   'A corner store, a specific bench, a shortcut everyone on your street knows about.',
   'regional', 'active', now(), now() + interval '30 days'
where not exists (select 1 from public.missions where title = 'Draw Your Neighborhood');

insert into public.missions (title, prompt, description, mission_type, status, starts_at, ends_at)
select 'Same Place, Different Eyes', 'Draw a place you''ve already drawn before -- from a different angle or mood this time.',
   'Pairs well with Draw This Wall: pick an existing public fresco and answer it.',
   'place', 'active', now(), now() + interval '30 days'
where not exists (select 1 from public.missions where title = 'Same Place, Different Eyes');
