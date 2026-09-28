# Sinopia: Setup checklist (Phase 0, Task 0)

Everything here needs a human with account access -- an agent can't create accounts or click through OAuth consent screens. Ian: work through this list, then send back the values in **"What to send back"**. Nothing in Tasks 1-7 of `docs/build/PHASE-0.md` starts until these are in hand.

## 1. Vercel (existing account -- no new sign-up)

1. Import the GitHub repo `Muj-csv/Sinopia` as a new Vercel project.
2. Set the project's **root directory** to `web/`.
3. Don't set environment variables yet -- come back after Supabase (step 2) and Mapillary (step 6).
4. Note the production URL Vercel assigns (e.g. `sinopia.vercel.app`).

## 2. Supabase

1. Create a new free project. **Region: Singapore** (closest to the Philippines).
2. In the dashboard, go to **Settings -> API** and copy the **Project URL** and **anon public key**.
3. Leave PostGIS/schema/OAuth for Phase 0 Task 3 (that's the agent's job once these values are in) -- for now this step is just "create the project and get the URL + anon key."

## 2b. Applying migrations (do this after every merge that adds one)

**Migrations are not applied by merging or deploying.** CI runs the tests; Vercel builds the app; neither touches the database. A new file under `supabase/migrations/` changes nothing until someone runs it.

After merging a PR that adds a migration:

1. Open the Supabase dashboard -> **SQL Editor** -> **New query**.
2. Paste the contents of each new `supabase/migrations/NNNN_*.sql` file, oldest first.
3. Run it. It takes effect immediately -- no redeploy needed.

Applied so far (tick when run against the production project):

- [ ] `0001_init.sql` -- the initial schema
- [ ] `0002_globe_storage_upsert_policies.sql` -- **required for Publish to Globe.** Without it every publish fails with "new row violates row-level security policy", and unpublishing silently leaves the images public.

To check whether a storage policy is live, run this in the SQL Editor:

```sql
select policyname, cmd from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
```

The `globe` bucket needs four: insert, select, update and delete. If you only see insert and delete, `0002` has not been applied.

## 3. Google OAuth

1. Create a Google Cloud project (or reuse one).
2. Configure the **OAuth consent screen**: type **External**, publishing status **Testing** is fine for the hackathon.
3. Create an **OAuth client ID** of type **Web application**.
4. In the Supabase dashboard, go to **Auth -> Providers -> Google** to find the exact **redirect URI** Supabase expects -- add that URI to the Google OAuth client's **Authorized redirect URIs**.
5. Paste the resulting **Client ID** and **Client secret** into Supabase's Google provider settings (not into the app or the repo).

## 4. GitHub OAuth

1. Go to **GitHub -> Settings -> Developer settings -> OAuth Apps -> New OAuth App**.
2. For the **Authorization callback URL**, use the callback URL Supabase shows under **Auth -> Providers -> GitHub**.
3. Paste the resulting **Client ID** and **Client secret** into Supabase's GitHub provider settings (not into the app or the repo).

## 5. Supabase Auth URL settings

In **Auth -> URL Configuration**:
- **Site URL:** the Vercel production URL from step 1.
- **Additional redirect URLs:** `http://localhost:5173` and the Vercel preview URL pattern (e.g. `https://sinopia-*.vercel.app/**`).

## 6. Openverse

1. Register a free API client at Openverse (gives higher rate limits than anonymous access).
2. This produces a **client ID** and **client secret** -- these stay server-side (Vercel env only), never in the browser bundle.

## 7. Mapillary

1. Create a free Mapillary developer account and app.
2. This produces a **client token** -- it's a client-side token by design (used directly from the browser).
3. Only needed for Phase 5a (street-level view), so it does **not** block Phase 0 -- send it whenever it's convenient.

## What to send back

| Value | From | Goes where (the agent will wire this up) |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Settings -> API | Vercel env + `web/.env.local` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Settings -> API | Vercel env + `web/.env.local` |
| `OPENVERSE_CLIENT_ID` | Openverse client registration | Vercel env only (server function) |
| `OPENVERSE_CLIENT_SECRET` | Openverse client registration | Vercel env only (server function) |
| `VITE_MAPILLARY_TOKEN` | Mapillary app (can come later, blocks only Phase 5a) | Vercel env + `web/.env.local` |
| Vercel production URL | Vercel project settings | Used for Supabase's Site URL, and reported back in every phase |

**Never send:** the Supabase **service-role key**. That key stays on Ian's machine only, for `scripts/seed.ts` (written in a later phase) -- it never goes in the repo, in Vercel, or in any message to the agent, since it bypasses every RLS policy in `docs/schema.sql`.

Once Supabase, Google OAuth, and GitHub OAuth are wired together (steps 2-5) and the values above are sent back, Phase 0 continues with Tasks 1-7: scaffolding `web/`, applying the schema, verifying RLS on two real test accounts, deploying to Vercel, and the globe/drawing spikes.
