# Phase 0 results

## Setup (Task 0)
Done, merged separately (`docs/SETUP.md`, PR #7). Keys received for Supabase (URL, publishable key) and Mapillary (access token). Openverse client credentials not yet registered -- `/api/references` is coded but untested end-to-end until those arrive.

## Scaffold (Task 1)
`web/` is a Vite + React + TS PWA (`vite-plugin-pwa`), ESLint + Prettier (not oxlint -- this phase's plan specifically calls for ESLint/Prettier), Vitest, Playwright, `web/.env.example`. GitHub Actions (`.github/workflows/ci.yml`) runs lint, format check, typecheck, Vitest, and `docs/schema.test.mjs` on push/PR.

## App shell (Task 2)
Bare shell with the four nav items (Globe, New, Sketchbook, Profile) at `/`, `/new`, `/sketchbook`, `/me`, styled only from `docs/design/theme.css` variables (no raw hex, no hand-edited theme.css).

## Supabase schema + RLS (Task 3-4)

**Not done by the agent** -- deliberately. Applying `schema.sql`/OAuth toggles to the live project and creating two live-project test accounts both need either the Supabase dashboard or the service-role key, and the service-role key should never reach the agent (see `docs/SETUP.md`). This needs Ian (or another teammate with dashboard access) to:

1. Paste `supabase/migrations/0001_init.sql` into the Supabase SQL editor and run it (enables PostGIS as part of the script).
2. Enable Google and GitHub providers under Auth -> Providers, using the client ID/secret already generated, and set Auth -> URL Configuration's Site URL to the Vercel production URL.
3. Re-run the 17 checks from `docs/schema.test.mjs` against the **real** project with two real signed-in accounts (the local run below is a proxy, not a substitute -- it doesn't touch live Postgres/Auth).

**What was verified instead:** all 17 checks in `docs/schema.test.mjs` pass locally against PGlite + PostGIS with Supabase-shaped stubs (auth.uid(), storage.objects, RLS). This confirms the SQL logic is correct; it is not the same as a pass on the real project.

```
schema applied
PASS profiles auto-created
PASS private fresco has no public_location
PASS neighborhood snaps to grid: POINT(120.59 15.145)
PASS exact keeps the point: POINT(120.58831 15.14507)
PASS B sees A public fresco
PASS B cannot read A exact location
PASS B cannot update A fresco
PASS moderation column not updatable by users
PASS globe_points returns public fresco
PASS same_wall finds the nearby fresco
PASS B cannot attach a location to A fresco
PASS reported fresco hidden from others
PASS reports not readable by users
PASS owner still sees own flagged fresco
PASS unpublish clears public_location
PASS A cannot write into B sketchbook folder
PASS B cannot list A sketchbook files
```

## Vercel deploy + /api/references (Task 5)

Not done by the agent (per the "I push/merge/deploy" workflow). `web/api/references.ts` is written and unit-tested (`sanitizeQuery`: trims, strips control characters, caps at 60 chars) but needs `OPENVERSE_CLIENT_ID`/`OPENVERSE_CLIENT_SECRET` in Vercel's env to actually call Openverse -- still pending registration.

**Deployed URL:** unknown to the agent -- Vercel project import and env var entry are manual steps. Report back the production URL and it'll get recorded here.

## Globe spike (Task 6)

MapLibre v5+ (`projection: 'globe'`), OpenFreeMap "Positron" style, attribution control. Builds and renders in the dev server; **not yet verified on a real phone** (needs `npm run dev` on a device on the same network, or the Vercel preview URL once deployed).

## Drawing spike (Task 7)

Konva stage (1600x1200 placeholder photo layer) + Perfect Freehand strokes, with an on-screen ms/segment readout. **Not yet measured on a real mid-range Android phone** -- that requires a physical device; the on-screen counter is there for whoever runs it.

## Bundle size (ARCHITECTURE.md §7 budget: <= 350 KB gzip initial)

Routes are lazy-loaded (`React.lazy`) since Konva and MapLibre are the two heaviest deps. Initial shell: **82.79 KB gzip** (under budget). The Globe route's own chunk is 276.55 KB gzip (mostly MapLibre) and loads immediately since Globe is the landing route -- an accepted tradeoff for now, not a Phase 0 blocker.

## What's still open before Phase 0's acceptance criteria are fully met

1. Someone with dashboard access applies the schema + OAuth to the real project (steps above) and re-runs the RLS checks with two real signed-in accounts.
2. Vercel env vars set (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MAPILLARY_TOKEN`, plus `OPENVERSE_CLIENT_ID`/`SECRET` once registered) and the project deployed; report the production URL.
3. Openverse client registration, so `/api/references` can be tested end-to-end.
4. Real-phone check: globe renders, drawing spike stays within ~16ms/segment.
