# Phase 0: Foundation + spikes

**When:** Sun Sep 27 (PHT). **Owners:** Ian (Supabase/schema), P4 (globe spike), P2 (drawing spike), P5 (references proxy).
**Goal:** a deployed skeleton where the riskiest pieces are proven: privacy rules on the real database, sign-in, a globe, and drawing speed on a real phone.
**Implements:** groundwork for FR-001, FR-005, FR-009; NFR-001, NFR-003, NFR-005.

## Tasks
0. Write `docs/SETUP.md`: a checklist of every account, credential and value Ian needs to create/provide (Vercel project import, Supabase project, Google OAuth, GitHub OAuth, Supabase Auth URL settings, Openverse client, Mapillary token), and exactly where each resulting value goes (Vercel env, `web/.env.local`, or Ian's machine only). **Pause here and wait for the keys before continuing to tasks 1-7.**
1. Scaffold per `CLAUDE.md` layout: `web/` (Vite + React + TS, vite-plugin-pwa), ESLint/Prettier, Vitest, Playwright; GitHub Actions running lint + tests; `web/.env.example` (empty values only; `.env*` except `.env.example` stays gitignored).
2. Import `docs/design/theme.css` globally; a bare app shell with the four nav items (Globe · New · Sketchbook · Profile) using only theme variables.
3. Supabase: create the free project (region: Singapore, closest to the Philippines); enable PostGIS; apply `docs/schema.sql` as `supabase/migrations/0001_init.sql`; enable Google and GitHub OAuth; set the site URL to the Vercel production domain.
4. Verify privacy on the **real** project with two test accounts: repeat the checks in `docs/schema.test.mjs` (one person's private fresco invisible to the other; the other can't read the first's exact location; neighborhood snapping; report hides; storage folders). Record results in `docs/build/PHASE-0-RESULTS.md`.
5. Vercel (existing account): import `Muj-csv/Sinopia`, root directory `web/`, set env vars, deploy; share the production URL. Add `web/api/references.ts`: `GET ?q=&page=` → Openverse image search (register a free client; use client credentials server-side), return `{id, thumbnail, url, title, creator, license, license_version, license_url, foreign_landing_url, provider}`, `Cache-Control: public, s-maxage=86400`.
6. Globe spike: MapLibre v5 with `projection: globe` and an OpenFreeMap style; attribution visible; renders on a phone.
7. Drawing spike: Konva stage over a 1600 px photo with Perfect Freehand strokes; measure on a mid-range Android phone (Chrome performance panel or an on-screen frame counter).

## Acceptance
- `docs/SETUP.md` exists and the team has the keys back from Ian before tasks 1-7 start.
- Deployed URL shows the globe; sign-in with Google works on the deployed domain.
- `PHASE-0-RESULTS.md` lists every RLS check as pass on the real project.
- `/api/references?q=fire%20hydrant` returns results with license fields; the client secret is not in the bundle (search the built JS).
- Drawing spike: strokes keep up with the finger (≤ 16 ms per segment on the test phone); if not, note what was tried.

## Don't touch
Capture pipeline, save/publish flows, viewer.

Stop and report the RLS results, the drawing measurement and the deployed URL.
