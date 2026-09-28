# Sinopia

Mobile-first web app for drawing on the real world. The artist photographs a place, draws over the photo (with an in-canvas reference panel for anything they're drawing), and saves the result, a **fresco**, to a private **Sketchbook** or publishes it to a public **globe** at the photo's location. The viewer shows a Reality ↔ Drawing slider, other frescoes at the same spot (**Same Wall**), and optionally the street-level view.

Read first: `docs/CONCEPT.md` (one page) → `docs/PRD.md` (what and why) → `docs/ARCHITECTURE.md` (how) → `docs/IMPLEMENTATION_PLAN.md` (order) → `docs/DECISIONS.md` (open questions). Design: `docs/design/DESIGN_BRIEF.md` (locked: tokens, type, colour, components, forbidden list) → `docs/design/UX_MAP.md` (flows and copy; it wins where the two differ) → `docs/design/SCREENS.md` (per-screen layout, states and do-nots). Schema: `docs/schema.sql`.

## Rules
- **$0 only** (D-002): free tiers and open-source libraries; never add a service that needs a credit card. No Google Maps; the map stack is MapLibre + OpenFreeMap + Photon + Nominatim + Mapillary/Panoramax (ADR-004).
- **No custom API server** (ADR-001). The browser talks to Supabase with the anon key; access control is Row Level Security and storage policies. The only server code is `web/api/references.ts` (Openverse proxy).
- **Secrets:** only `VITE_*` values reach the browser. The service-role key and Openverse credentials never appear in client code or the repo.
- **Privacy is enforced by the database.** Exact GPS lives only in `fresco_locations` (owner-only). Never add an exact-location column to `frescoes`, never compute the public point in the client, never show street-level imagery for `neighborhood` frescoes.
- **Strip EXIF:** every uploaded image goes through the canvas → WebP pipeline first.
- **Schema changes** go in a new migration and must keep `docs/schema.test.mjs` passing (update it in the same change). **Merging a migration does not apply it** -- nothing in CI or Vercel touches the database. Say so in the PR, and follow `docs/SETUP.md` §2b to run it.
- **Storage policies follow the statement, not the intent.** `upload({ upsert: true })` is `INSERT ... ON CONFLICT DO UPDATE`, which needs SELECT and UPDATE policies as well as INSERT -- an INSERT-only policy rejects it even when nothing conflicts. Cover each bucket's real client operations in `docs/schema.test.mjs`.
- **Styling:** only CSS variables from `docs/design/theme.css`. It is generated: edit `docs/design/tokens.json`, then run `node scripts/tokens-export.mjs` (`--check` fails if it is stale). Never hand-edit `theme.css`. No raw hex, no stock palette classes. Every state in `UX_MAP.md` exists.
- **The look is ink on notebook paper with one yellow (D-014).** Shared components live in `web/src/ui/` (`ui.css`, `Icon.tsx`, `FlowBar.tsx`, `Popover.tsx`); build screens from those rather than inventing a button or card. The rules that are easiest to break: one yellow button per screen; yellow is only ever a fill with ink on it; one 2 px ink edge plus a hard offset on pressable things, and **no blurred shadows and no `backdrop-filter` anywhere**; handwriting (Gochi, Gaegu) never in long text; no lined paper or yellow behind or around a photo, the canvas, the globe or a fresco; notices never get a coloured side stripe. The full forbidden list is `DESIGN_BRIEF.md` §11.
- **Drawing model:** brushes and colours are defined once, in `web/src/draw/brushes.ts` and `web/src/draw/palette.ts`. Add a brush or a colour there, never inline in a component. Stroke geometry goes through `outlinePoints(points, size, tool)`; a stroke's `tool` is persisted in the draft, so widening `ToolName` needs a case in `migrateHistory`.
- **References:** Openverse only; always show license, creator and source link; don't store reference images.
- **Copy:** fresco, sinopia (draft), Sketchbook, Same Wall. No likes, follower counts, rankings or "trending".
- Attribution for OpenStreetMap/OpenFreeMap (and Mapillary/Panoramax when shown) is always visible on maps.

## Layout
```
web/           Vite + React + TS app
  src/auth, src/capture, src/draw, src/references, src/frescoes,
  src/sketchbook, src/globe, src/viewer, src/safety (if time), src/lib
  src/ui               shared components: ui.css, Icon.tsx (+ sprite.svg), FlowBar.tsx, Popover.tsx
  api/references.ts     Vercel function (Openverse proxy, cached)
supabase/      migrations/0001_init.sql (from docs/schema.sql)
scripts/       seed.ts (demo frescoes, uses the service-role key locally only)
               tokens-export.mjs (tokens.json -> theme.css)
docs/          concept, PRD, architecture, plan, decisions, design/, build/PHASE-N.md, schema.sql, schema.test.mjs
  design/      DESIGN_BRIEF.md, SCREENS.md, UX_MAP.md, TREND_SWEEP.md, COUNCIL_studio-v0.md, tokens.json, theme.css
```

## Commands
- `cd web && npm i && npm run dev` · `npm test` (Vitest) · `npm run e2e` (Playwright)
- `node docs/schema.test.mjs` (needs `@electric-sql/pglite` + `@electric-sql/pglite-postgis`)
- `node scripts/tokens-export.mjs` after any change to `docs/design/tokens.json`

## Out of scope
Likes · followers · feeds · comments · generative AI · AR · native apps · paid services · email magic-link auth · the old gesture/pose-matching idea.

## Keeping docs current
`README.md` is a living draft. When a feature lands or changes, update its row in the README Features table (Planned → Done) in the same change.

## Branches and PRs
- One branch per phase, prefixed by owner (see `IMPLEMENTATION_PLAN.md`'s owner table): `platform/`, `canvas/`, `capture/`, `globe/`, `refs/`, `design/`. Phase 0 first (everything depends on it); Phase 1 (canvas) and Phase 2 (references) run in parallel afterward, since different people own them.
- One PR per phase into `main`. Never push directly to `main`.
- Squash-merge only after Ian reviews. `main` auto-deploys to production on Vercel.
- Any schema change ships in a new migration file, with `docs/schema.test.mjs` updated in the same PR.

## Environment variables

| Variable | Where | Visible to browser? |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Vercel env + `web/.env.local` | Yes (by design, protected by RLS) |
| `VITE_MAPILLARY_TOKEN` | Vercel env + `web/.env.local` | Yes (client token) |
| `OPENVERSE_CLIENT_ID`, `OPENVERSE_CLIENT_SECRET` | Vercel env only (server function) | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Ian's machine only, for `scripts/seed.ts` | No, never commit |

Commit only `web/.env.example` with empty values. `.env*` except `.env.example` is gitignored. Full account setup checklist: `docs/SETUP.md`.

## How to work
Do one `docs/build/PHASE-N.md` at a time, run the tests, then **stop and report**: what was built, the acceptance checks each marked pass/fail, the preview URL, anything cut or changed. Don't start the next phase until the reply comes back.
