// Local check of docs/schema.sql with PGlite + PostGIS and small Supabase stubs (auth.uid, storage).
// Run: npm i @electric-sql/pglite @electric-sql/pglite-postgis && node docs/schema.test.mjs
// It is not a real Supabase instance: re-test RLS in the Supabase dashboard in Phase 0.
import { PGlite } from '@electric-sql/pglite'
import { postgis } from '@electric-sql/pglite-postgis'
import fs from 'fs'
const pg = new PGlite({ extensions: { postgis } })
const q = (s, p) => pg.query(s, p)
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1 }

// --- Supabase stubs
await pg.exec(`
create schema if not exists extensions;
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, unique (bucket_id, name));
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated;
grant all on storage.objects to authenticated; grant select on storage.objects to anon;
grant execute on function storage.foldername(text) to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
`)
let sql = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
await pg.exec(sql)
await pg.exec(`grant usage on schema extensions to anon, authenticated;`)
console.log('schema applied')

const A = '11111111-1111-1111-1111-111111111111', B = '22222222-2222-2222-2222-222222222222'
const C = '55555555-5555-5555-5555-555555555555'
await pg.exec(
  `insert into auth.users (id, raw_user_meta_data) values ('${A}', '{"name":"Ian"}'), ('${B}', '{}'), ('${C}', '{}');`,
)
ok((await q(`select count(*)::int n from public.profiles`)).rows[0].n === 3, 'profiles auto-created')

async function as(uid, fn) {
  await pg.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`)
  try { return await fn() } finally { await pg.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`) }
}
const F = '33333333-3333-3333-3333-333333333333'
await as(A, async () => {
  await q(`insert into public.frescoes (id, owner_id, title, photo_path, drawing_path, composite_path, thumb_path)
           values ($1, $2, 'After the rain', 'a/p', 'a/d', 'a/c', 'a/t')`, [F, A])
  await q(`insert into public.fresco_locations (fresco_id, owner_id, location)
           values ($1, $2, 'SRID=4326;POINT(120.58831 15.14507)')`, [F, A])
})
let r = (await q(`select public_location is null as n from public.frescoes where id=$1`, [F])).rows[0]
ok(r.n, 'private fresco has no public_location')

await as(A, () => q(`update public.frescoes set visibility='public', pin_precision='neighborhood' where id=$1`, [F]))
r = (await q(`select extensions.st_astext(public_location::extensions.geometry) t, published_at is not null p from public.frescoes where id=$1`, [F])).rows[0]
ok(r.t === 'POINT(120.59 15.145)' && r.p, 'neighborhood snaps to grid: ' + r.t)
await as(A, () => q(`update public.frescoes set pin_precision='exact' where id=$1`, [F]))
r = (await q(`select extensions.st_astext(public_location::extensions.geometry) t from public.frescoes where id=$1`, [F])).rows[0]
ok(r.t === 'POINT(120.58831 15.14507)', 'exact keeps the point: ' + r.t)
await as(A, () => q(`update public.frescoes set pin_precision='neighborhood' where id=$1`, [F]))

await as(B, async () => {
  ok((await q(`select count(*)::int n from public.frescoes`)).rows[0].n === 1, 'B sees A public fresco')
  ok((await q(`select count(*)::int n from public.fresco_locations`)).rows[0].n === 0, 'B cannot read A exact location')
  const u = await q(`update public.frescoes set title='hacked' where id=$1 returning id`, [F]); ok(u.rows.length === 0, 'B cannot update A fresco')
  let e = null; try { await q(`update public.frescoes set moderation='ok'`) } catch (x) { e = x } ; ok(!!e, 'moderation column not updatable by users')
  ok((await q(`select count(*)::int n from public.globe_points()`)).rows[0].n === 1, 'globe_points returns public fresco')
})
// B's own public fresco ~30 m away, for same_wall
const G = '44444444-4444-4444-4444-444444444444'
await as(B, async () => {
  await q(`insert into public.frescoes (id, owner_id, title, visibility, pin_precision, photo_path, drawing_path, composite_path, thumb_path)
           values ($1, $2, 'Same corner', 'public', 'neighborhood', 'b/p','b/d','b/c','b/t')`, [G, B])
  await q(`insert into public.fresco_locations (fresco_id, owner_id, location) values ($1, $2, 'SRID=4326;POINT(120.58850 15.14520)')`, [G, B])
  const w = await q(`select id from public.same_wall($1, 50)`, [F]); ok(w.rows.length === 1 && w.rows[0].id === G, 'same_wall finds the nearby fresco')
  let e = null; try { await q(`insert into public.fresco_locations (fresco_id, owner_id, location) values ($1, $2, 'SRID=4326;POINT(0 0)')`, [F, B]) } catch (x) { e = x } ; ok(!!e, 'B cannot attach a location to A fresco')
  await q(`insert into public.reports (fresco_id, reporter_id, reason) values ($1, $2, 'test')`, [F, B])
  ok((await q(`select count(*)::int n from public.frescoes where id=$1`, [F])).rows[0].n === 0, 'reported fresco hidden from others')
  ok((await q(`select count(*)::int n from public.reports`)).rows[0].n === 0, 'reports not readable by users')
})
await as(A, async () => {
  ok((await q(`select count(*)::int n from public.frescoes where id=$1`, [F])).rows[0].n === 1, 'owner still sees own flagged fresco')
  await q(`update public.frescoes set visibility='private' where id=$1`, [F])
})
ok((await q(`select public_location is null n from public.frescoes where id=$1`, [F])).rows[0].n, 'unpublish clears public_location')
// storage policies
await as(A, async () => {
  await q(`insert into storage.objects (bucket_id, name) values ('sketchbook', '${A}/${F}/photo.webp')`)
  let e = null; try { await q(`insert into storage.objects (bucket_id, name) values ('sketchbook', '${B}/x/photo.webp')`) } catch (x) { e = x } ; ok(!!e, 'A cannot write into B sketchbook folder')
})
await as(B, async () => { ok((await q(`select count(*)::int n from storage.objects where bucket_id='sketchbook'`)).rows[0].n === 0, 'B cannot list A sketchbook files') })

// Publishing copies into 'globe' with upsert, which Postgres runs as INSERT ... ON CONFLICT DO
// UPDATE. That is checked against an UPDATE policy even when nothing conflicts, so a bucket with
// only INSERT and DELETE policies rejects every publish. This is the shape the client issues.
const upsertGlobe = (owner, file) =>
  q(`insert into storage.objects (bucket_id, name) values ('globe', '${owner}/${F}/${file}.webp')
     on conflict (bucket_id, name) do update set name = excluded.name`)

await as(A, async () => {
  let e = null; try { await upsertGlobe(A, 'photo') } catch (x) { e = x }
  ok(!e, 'owner can publish (upsert) into their own globe folder' + (e ? ': ' + e.message : ''))
  e = null; try { await upsertGlobe(A, 'photo') } catch (x) { e = x }
  ok(!e, 'owner can re-publish over their own globe files' + (e ? ': ' + e.message : ''))
})
await as(B, async () => {
  let e = null; try { await upsertGlobe(A, 'photo') } catch (x) { e = x }
  ok(!!e, 'B cannot overwrite A globe files')
  // The owner-scoped SELECT policy publishing needs must not become a way to enumerate other
  // people's files. Public READ of a published image comes from the bucket being public, and is
  // served from the public URL without consulting these policies.
  ok((await q(`select count(*)::int n from storage.objects where bucket_id='globe'`)).rows[0].n === 0, 'B cannot list A globe files')
})
await as(A, async () => {
  await q(`delete from storage.objects where bucket_id='globe' and name like '${A}/%'`)
  ok((await q(`select count(*)::int n from storage.objects where bucket_id='globe'`)).rows[0].n === 0, 'owner can unpublish (delete) their globe files')
})

// ===== Update 1.2: profile avatars (0003_profile_avatar.sql) =====
// The avatar is public by design (it appears beside every published fresco), but it is still
// yours to set. profiles has no column-level grants, so these checks are what prove the existing
// row-level update policy actually covers a column added after it was written.
await as(A, async () => {
  await q(`update public.profiles set avatar = $1 where id = $2`, ['{"skin":2,"hair":5}', A])
  const r = await q(`select avatar->>'skin' as skin from public.profiles where id=$1`, [A])
  ok(r.rows[0].skin === '2', 'owner can set their own avatar')
})
await as(B, async () => {
  const r = await q(`select avatar->>'skin' as skin from public.profiles where id=$1`, [A])
  ok(r.rows[0].skin === '2', 'B can see A avatar (profiles are public)')
  const u = await q(`update public.profiles set avatar = $1 where id = $2 returning id`, ['{"skin":0}', A])
  ok(u.rows.length === 0, 'B cannot change A avatar')
})
ok((await q(`select avatar is null as n from public.profiles where id=$1`, [B])).rows[0].n,
   'a profile with no avatar chosen stays null')

// ===== Update: Sinopia Neighbors (0004_friends.sql) =====
{
  const codes = (await q(`select id, friend_code from public.profiles where id in ($1,$2,$3)`, [A, B, C])).rows
  ok(codes.every((r) => /^[0-9A-F]{8}$/.test(r.friend_code)), 'every profile got an 8-char friend_code')
  ok(new Set(codes.map((r) => r.friend_code)).size === 3, 'friend_codes are unique')

  // A sends B a request (the client looks B up by code first; simulated here with the id it finds).
  let req
  await as(A, async () => {
    req = (await q(
      `insert into public.friend_requests (requester_id, addressee_id) values ($1,$2) returning id`,
      [A, B],
    )).rows[0]
  })
  await as(B, async () => {
    ok((await q(`select status from public.friend_requests where id=$1`, [req.id])).rows[0].status === 'pending',
       'B sees the pending request A sent')
  })
  await as(C, async () => {
    ok((await q(`select count(*)::int n from public.friend_requests`)).rows[0].n === 0,
       'a stranger sees no one else’s friend requests')
  })

  // B trying to friend-request themselves, or request A a second time, both fail.
  await as(B, async () => {
    let e = null
    try { await q(`insert into public.friend_requests (requester_id, addressee_id) values ($1,$1)`, [B]) }
    catch (x) { e = x }
    ok(!!e, 'cannot send a friend request to yourself')

    e = null
    try { await q(`insert into public.friend_requests (requester_id, addressee_id) values ($1,$2)`, [B, A]) }
    catch (x) { e = x }
    ok(!!e, 'B requesting A while A’s request to B is still pending collides on the same pair')
  })

  // The requester cannot accept their own request -- only the addressee can.
  await as(A, async () => {
    const u = await q(`update public.friend_requests set status='accepted' where id=$1 returning id`, [req.id])
    ok(u.rows.length === 0, 'the requester cannot accept their own request')
  })
  await as(B, async () => {
    const u = await q(`update public.friend_requests set status='accepted' where id=$1 returning id`, [req.id])
    ok(u.rows.length === 1, 'the addressee accepts the request')
  })
  await as(A, async () => {
    ok((await q(`select status from public.friend_requests where id=$1`, [req.id])).rows[0].status === 'accepted',
       'A sees the request as accepted too')
  })

  // Either side can end an accepted friendship.
  await as(A, async () => {
    const d = await q(`delete from public.friend_requests where id=$1 returning id`, [req.id])
    ok(d.rows.length === 1, 'either side can remove an accepted friendship (unfriend)')
  })

  // A fresh pending request: the addressee can decline (delete) it, and a third party cannot.
  let req2
  await as(A, async () => {
    req2 = (await q(
      `insert into public.friend_requests (requester_id, addressee_id) values ($1,$2) returning id`,
      [A, B],
    )).rows[0]
  })
  await as(C, async () => {
    const d = await q(`delete from public.friend_requests where id=$1 returning id`, [req2.id])
    ok(d.rows.length === 0, 'a stranger cannot delete someone else’s pending request')
  })
  await as(B, async () => {
    const d = await q(`delete from public.friend_requests where id=$1 returning id`, [req2.id])
    ok(d.rows.length === 1, 'the addressee can decline a pending request')
  })

  // Favorite fresco: must be your own, published, unflagged work. F (above) has since been
  // reported and unpublished, so this uses a fresh, clean fresco of A's own rather than reusing it.
  const H = '66666666-6666-6666-6666-666666666666'
  await as(A, () =>
    q(
      `insert into public.frescoes (id, owner_id, title, visibility, pin_precision, photo_path, drawing_path, composite_path, thumb_path)
       values ($1, $2, 'A clean corner', 'public', 'neighborhood', 'a/p2','a/d2','a/c2','a/t2')`,
      [H, A],
    ),
  )
  await as(A, async () => {
    let e = null
    try { await q(`update public.profiles set favorite_fresco_id=$1 where id=$2`, [G, A]) } catch (x) { e = x }
    ok(!!e, 'cannot favorite someone else’s fresco')

    e = null
    try { await q(`update public.profiles set favorite_fresco_id=$1 where id=$2`, [H, A]) } catch (x) { e = x }
    ok(!e, 'can favorite your own published fresco' + (e ? ': ' + e.message : ''))
  })
  ok((await q(`select favorite_fresco_id from public.profiles where id=$1`, [A])).rows[0].favorite_fresco_id === H,
     'favorite is set')

  await as(A, () => q(`update public.frescoes set visibility='private' where id=$1`, [H]))
  ok((await q(`select favorite_fresco_id is null as n from public.profiles where id=$1`, [A])).rows[0].n,
     'unpublishing the favorited fresco clears the favorite')
}
