-- Sinopia Neighbors: mutual friend requests, a per-artist code/QR to send one, and a favorite
-- fresco each artist can surface beside their globe.
--
-- Every account already gets a code the moment it exists (handle_new_user now assigns one), the
-- same way it already gets a globe. A code is how you invite someone without either of you typing
-- a UUID; the QR the client renders from it is just that code wrapped in a link, so scanning it
-- with an ordinary camera app opens `/friend/<code>` and needs no in-app scanner to exist.
--
-- A "friend request" row is the whole relationship: pending means sent-not-yet-accepted, accepted
-- means neighbors. There is no separate friendships table -- once accepted, the row itself is the
-- edge, and deleting it (by either side) covers cancel, decline and unfriend alike, so there is
-- exactly one state machine to reason about instead of three.

-- ---------------------------------------------------------------------------
-- profiles: a code every account has from creation, and an optional favorite fresco
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists friend_code text;
alter table public.profiles add column if not exists favorite_fresco_id uuid
  references public.frescoes (id) on delete set null;

create or replace function public.generate_friend_code()
returns text
language sql
volatile
as $$
  -- 8 uppercase hex characters: easy to read aloud or type by hand, and at 16^8 combinations
  -- collisions are rare enough that the retry loops below are a formality, not a real limit.
  select upper(substr(md5(gen_random_uuid()::text), 1, 8));
$$;

-- Backfill every account that already exists (there is no migration-ordering guarantee that new
-- signups outnumber existing ones), one at a time so two accounts never land on the same code.
do $$
declare
  r record;
  v_code text;
begin
  for r in select id from public.profiles where friend_code is null loop
    loop
      v_code := public.generate_friend_code();
      exit when not exists (select 1 from public.profiles where friend_code = v_code);
    end loop;
    update public.profiles set friend_code = v_code where id = r.id;
  end loop;
end;
$$;

alter table public.profiles alter column friend_code set not null;
alter table public.profiles add constraint profiles_friend_code_key unique (friend_code);

-- Every new account gets a code the same moment it gets a profile, exactly like it already gets a
-- globe with nothing on it.
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

-- A favorite has to be your own, published, and not hidden by a report -- it is shown beside your
-- globe to anyone who can see that globe, so it is held to the same bar as anything else there.
-- Enforced here rather than trusted from the client: "privacy is enforced by the database".
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

-- If a favorited fresco is later unpublished or flagged, it stops qualifying -- clear the pointer
-- rather than leave a favorite silently referencing something that no longer passes the check
-- above (an update to a *different* profile column would otherwise sail through untouched).
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

-- ---------------------------------------------------------------------------
-- friend_requests
-- ---------------------------------------------------------------------------
create type public.friend_request_status as enum ('pending', 'accepted');

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

alter table public.friend_requests enable row level security;

create policy "see your own friend requests" on public.friend_requests
  for select using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "send a friend request" on public.friend_requests
  for insert with check (requester_id = auth.uid());

-- Only the addressee can move a pending request to accepted; nothing else about a row is ever
-- updatable (there is no "decline" status -- declining just deletes the row, below).
create policy "addressee accepts a pending request" on public.friend_requests
  for update using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status = 'accepted');

-- Covers cancel (requester deletes a pending row), decline (addressee deletes a pending row) and
-- unfriend (either side deletes an accepted row) with one policy and no extra status values.
create policy "either side removes a friend request" on public.friend_requests
  for delete using (requester_id = auth.uid() or addressee_id = auth.uid());
