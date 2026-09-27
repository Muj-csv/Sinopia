<div align="center">

# Sinopia

**Draw on the real world. Leave it where you found it.**

*Sinopia* (the reddish underdrawing a fresco painter sketched on the wall before painting)

![Status](https://img.shields.io/badge/status-in%20development-orange)
![Platform](https://img.shields.io/badge/platform-web%20%2F%20PWA-5A67D8)
![Cost](https://img.shields.io/badge/cost-%240%20open%20stack-2F3B4C)
![Hackathon](https://img.shields.io/badge/GIBC%20V2-Track%2003%20Open-blue)

</div>

> **Draft README.** Sinopia is being built for the Global Innovation Build Challenge V2 (Sept–Oct 2026). Features marked *planned* aren't finished yet, and this document will change as the project does.

---

## Overview

You photograph a real place and draw your own interpretation on top of it: a creature on the rooftops, a fire hydrant that isn't there, a street as you remember it. When you're unsure how something looks, a reference panel beside the canvas finds openly licensed photos of anything you're drawing.

A finished piece is a **fresco**. Keep it private in your **Sketchbook**, or publish it to the **globe**, pinned where you took the photo. Anyone can spin the globe, open your fresco, slide between the real photo and your drawing, and see every other fresco made at the same spot: **same wall, different eyes**.

## Features

| Feature | Status |
|---|---|
| Capture a photo with its GPS spot (from the photo or your phone), draggable pin | Done |
| Draw over the photo: brush, eraser, colors, layers, undo/redo | Done |
| Reference panel: search anything you're drawing, with license and source on every image | Done |
| Sketchbook: your private album of frescoes | Done |
| Publish to the globe, pinned at the exact spot or just the neighborhood | Done |
| Globe with clustered pins, from world view to street level | Planned |
| Fresco viewer with a Reality ↔ Drawing slider | Planned |
| Same Wall: other frescoes made within 50 m | Planned |
| Report a fresco | Planned |
| Street-level view of the real spot beside the fresco | Planned, if time |
| In-browser safety check before publishing | Planned, if time |

## How it works

```mermaid
flowchart LR
  P[Photo of a real place] --> D[Draw your interpretation]
  R[Reference panel] -.-> D
  D --> F[Fresco]
  F --> S[Sketchbook\nprivate]
  F --> G[Globe\npublic]
  G --> V[Viewer: real ↔ drawing\nSame Wall · street view]
```

1. **Capture.** Take or upload a photo; Sinopia reads where and when it was taken.
2. **Draw.** Sketch over the photo on your phone or laptop. The photo itself is never changed.
3. **Reference.** Type what you're drawing ("fire hydrant", "shiba inu") and keep the results beside the canvas.
4. **Keep or share.** Save to your Sketchbook, or publish to the globe at the exact spot or neighborhood level.
5. **Explore.** Open any fresco, compare it with the real place, and see how others drew the same wall.

## Privacy and licensing

- **You choose what's public.** Frescoes are private by default; publishing is per fresco and can be undone any time.
- **Your exact location stays yours.** The precise spot is stored where only you can read it; the public pin is either the exact spot (your choice, with a warning) or snapped to the neighborhood. Photo metadata (EXIF, including GPS) is stripped before upload.
- **References come from openly licensed sources** via Openverse. Each shows the license, creator and source as reported upstream; check it at the source before reuse. Sinopia doesn't store reference images.
- **Your frescoes are your work.** Sinopia's code is open source; the artwork belongs to the artists.

## Tech stack ($0)

| Layer | Technology |
|---|---|
| Web app | TypeScript, Vite, React (PWA) |
| Drawing | Konva, Perfect Freehand |
| Database, auth, storage | Supabase (Postgres + PostGIS, Row Level Security) |
| Hosting | Vercel |
| Globe and maps | MapLibre GL JS, OpenFreeMap tiles, OpenStreetMap data |
| Geocoding | Nominatim (reverse), Photon (search) |
| References | Openverse API |
| Street-level imagery | Mapillary, Panoramax |
| Tests | Vitest, Playwright, PGlite (schema tests) |

## Getting started

> Setup steps will be confirmed once the first build lands.

**Hosting:** Vercel (existing account), importing `Muj-csv/Sinopia` with root directory `web/`. Account setup and every key/value the team needs to send back: [docs/SETUP.md](docs/SETUP.md).

**Requirements**
- Node.js 20+
- A free Supabase project (Vercel account already exists)
- (optional) A free Mapillary client token and Openverse API client

**Run the app**
```bash
git clone https://github.com/Muj-csv/Sinopia.git
cd Sinopia/web
cp .env.example .env.local   # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_MAPILLARY_TOKEN
npm install
npm run dev
```

**Set up the database**
```bash
# In the Supabase SQL editor (or with the Supabase CLI), run:
supabase/migrations/0001_init.sql      # from docs/schema.sql
# Optional local check of the schema and privacy rules:
npm i @electric-sql/pglite @electric-sql/pglite-postgis && node docs/schema.test.mjs
```

**Environment on Vercel:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MAPILLARY_TOKEN`, `OPENVERSE_CLIENT_ID`, `OPENVERSE_CLIENT_SECRET` (the last two server-side only).

## Project structure

```
web/                The Sinopia web app (capture, draw, references, sketchbook, globe, viewer)
web/api/            Vercel function: references proxy (Openverse)
supabase/           Migrations (tables, Row Level Security, storage policies)
scripts/            Seed script for demo frescoes
docs/               Concept, PRD, architecture, plan, decisions, design, build phases
```

## Documentation

- [Concept (one page)](docs/CONCEPT.md)
- [Product requirements](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md) · [Database schema](docs/schema.sql)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Decision log](docs/DECISIONS.md) · [Validation](docs/VALIDATION.md)
- [Design brief](docs/design/DESIGN_BRIEF.md) · [UX map](docs/design/UX_MAP.md)
- [Setup checklist (accounts, keys)](docs/SETUP.md)

## Known limitations

- **Free tiers:** storage and bandwidth are limited, so images are compressed; a free Supabase project pauses after 7 days without use.
- **Street-level imagery** from open sources doesn't cover everywhere; where there's none, the viewer shows the map.
- **Reference licenses** are as reported by the source.
- **Moderation** is basic during the hackathon: one report hides a fresco until the team reviews it.

## Roadmap

- [ ] MVP for GIBC V2 (see [implementation plan](docs/IMPLEMENTATION_PLAN.md))
- [ ] Suggest reference words from what you're drawing
- [ ] "Draw this wall too": respond to someone's fresco at the same place
- [ ] Place timelines: the same wall across years
- [ ] Collections and map stories

## Team

GIBC requires real full names on Devpost; the 5 below are still placeholders pending names from the team (see `docs/SETUP.md`).

| Name | Role |
|---|---|
| Ian Patrick Flores | Lead — Supabase, schema + privacy, save/publish/unpublish/delete, merges & deploys |
| _TBD (P2)_ | Drawing canvas — Konva, layers, brush, undo/redo, autosave |
| _TBD (P3)_ | Capture — camera/upload, EXIF GPS, pin picker, place name, compression; Reality ↔ Drawing slider |
| _TBD (P4)_ | Globe and viewer — MapLibre globe, clustering, Photon search, Same Wall, street-level if time |
| _TBD (P5)_ | References — `/api/references` proxy, reference panel, Sketchbook screens |
| _TBD (P6)_ | Design and QA — app shell, component states, seeded frescoes, phone testing, Devpost |

## License

MIT for code. Frescoes belong to their artists.

## Acknowledgments

Built for the **Global Innovation Build Challenge V2**. Map data © OpenStreetMap contributors; tiles by OpenFreeMap / OpenMapTiles. Reference images courtesy of their creators via Openverse; street-level imagery from Mapillary and Panoramax contributors.
