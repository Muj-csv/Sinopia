-- Place History (the PRD's "Place Timeline"): every public fresco around a point, through time.
--
-- A place is a point plus a radius, not a table. Grouping by distance is enough to start with, and
-- a `places` table can be added later without changing these signatures. Only public_location is
-- read -- the derived, public-safe pin -- never fresco_locations, so a neighbourhood fresco joins
-- the history at its snapped point and its exact spot stays private (PRD G-01/G-02).
--
-- Both functions are security invoker, so RLS applies inside them exactly as it does to the
-- client. The visibility/moderation filters are repeated anyway, so an owner never sees their
-- own private or flagged frescoes in what is meant to be the public history.
--
-- "When" is when the place was seen: the photo's date, else the day the fresco was saved. The year
-- is computed here (UTC) and returned, so the client groups by the same year it filtered by.

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
