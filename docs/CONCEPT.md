# Sinopia: Concept (v1, single combined idea)

*2026-09-27 · The one-page idea. Build details: `PRD.md` → `ARCHITECTURE.md` → `IMPLEMENTATION_PLAN.md`. Combines the Living Earth and First Commit briefs with the original Sinopia's slider and license trust layer; the earlier gesture/anatomy matching was dropped (D-001).*

> **Draw on the real world. Leave it where you found it.**

## 1. The idea in one paragraph

You take a photo of a real place (a Tokyo side street, your campus, a jeepney stop), then draw your own interpretation on top of it: a creature, a building, a fire hydrant that isn't there. When you're unsure how something should look, you open a reference panel beside the canvas and search for anything you're drawing. Finished pieces are called **frescoes**. You keep a fresco private in your **Sketchbook**, or publish it to a shared **globe**, pinned at the exact spot you took the photo. Anyone can spin the globe, tap Tokyo, open your fresco, slide between the real photo and your drawing, see the street-level view of that spot, and browse other people's frescoes of the same place.

## 2. Why the name works

A *sinopia* is the underdrawing a fresco painter sketched on the wall before painting. In the app, the real world is the wall:

| In fresco painting | In Sinopia |
|---|---|
| The wall | Your photo of a real place |
| The sinopia (underdrawing) | Your drawing while it's in progress (a draft) |
| The fresco | Your finished piece, private or on the globe |
| A workshop's pattern books | The reference panel |

So the vocabulary is built in: you draw a **sinopia**, you finish a **fresco**, you keep them in your **Sketchbook**, and the place view is **Same Wall** (every fresco made at one spot). *Alternative unit name if you'd rather go Filipino: **Bakas** ("trace, footprint").*

## 3. Who it's for

- **Primary:** art students and hobby artists who sketch on location or love drawing over photos, and want both references and a place to keep and share that work.
- **Secondary:** anyone exploring a place through how other people drew it (travellers, locals, classmates).

## 4. Core flows

1. **Capture.** Take or upload a photo. GPS comes from the photo's EXIF data or the phone's location; the user can drag the pin to fix it. A place name is filled in automatically.
2. **Draw.** Freehand brush, eraser, colors, opacity, layers, undo/redo, over the photo. The photo is never altered; the drawing is saved as its own layer.
3. **Reference (for anything).** Tap *Reference* → type what you're drawing ("fire hydrant", "shiba inu", "vending machine") → a side panel shows openly licensed photos, each with its license and source. Quick chips run angle variants in the background ("side view", "from above", "close-up").
4. **Finish.** Title, optional caption and "what I remember" note, style tags. Choose **Sketchbook (private)** or **Globe (public)**, and pin precision: *exact spot* or *neighborhood* (for anything near a home).
5. **Explore.** Globe → zoom → clustered pins → tap a pin → **fresco viewer**:
   - **Reality ↔ Drawing slider** over your own photo.
   - **Street-level view** of the same spot, where open imagery exists.
   - **Same Wall strip:** other public frescoes within ~50 m.
6. **Sketchbook.** A private carousel/album of your frescoes, grouped by place or date, with titles and descriptions; edit, publish or unpublish any time.

## 5. What makes it different

Map-art apps pin drawings to coordinates; photo apps pin photos; reference sites find images. Sinopia's unit is **photo + drawing + place + time**, with references built into the drawing step and the real place shown next to the reinterpretation. No likes, follower counts or feeds; discovery is geographic.

## 6. The $0 stack (checked 2026-09-27)

Every piece is free or open source, and none of them needs a credit card:

| Need | Choice | Cost / license | Notes |
|---|---|---|---|
| Hosting | **Vercel Hobby** | Free; personal, non-commercial use | Fallback: Cloudflare Pages (free) |
| Database, sign-in, image storage | **Supabase Free** (Postgres + PostGIS, Auth, Storage) | Free: 500 MB DB, 1 GB files, 5 GB egress/month, 50k monthly users | **Pauses after 1 week of inactivity**: open it every few days during judging |
| Globe + map | **MapLibre GL JS v5** (globe projection) | Open source (BSD-3) | Built-in point clustering |
| Map tiles | **OpenFreeMap** | Free, no key, no limits, commercial OK | Attribution required: "© OpenMapTiles Data from OpenStreetMap" |
| Street-level view | **Mapillary** (MapillaryJS viewer, API v4) | Free token; imagery CC BY-SA | Coverage varies; fall back to **Panoramax** (fully open) or just the map. Google Street View avoided because it needs a billing card |
| Place name from GPS | **Nominatim** (OpenStreetMap) | Free; max 1 request/second, no autocomplete | Call once per upload |
| Place search box | **Photon** (komoot) | Free public API, fair use | Supports search-as-you-type |
| GPS from photo | **exifr** | Open source (MIT) | Plus the browser Geolocation API |
| Drawing canvas | **Konva** (layers) + **Perfect Freehand** (natural strokes) | Open source (MIT) | Avoid tldraw: its SDK needs a license key in production |
| References | **Openverse API** | Free; openly licensed images incl. Wikimedia Commons and Flickr | Register a free client for a higher rate limit; show license + source on every result |
| Image compression | **browser-image-compression** → WebP | Open source (MIT) | ~1600 px ≈ 300 KB per image keeps Supabase's 1 GB useful |
| Public-post safety | **nsfwjs** (runs in the browser) + a Report button | Open source (MIT) | Check before publishing to the globe; reported frescoes are hidden until reviewed |
| *(optional)* Weather at capture | **Open-Meteo** | Free, no key, non-commercial | "Light rain, 24°C" on the fresco card |
| *(stretch)* Guess what you're drawing | Model trained on Google's **Quick, Draw!** dataset | Dataset CC BY 4.0 | Suggests reference words from your strokes; typing always works |

**Budget: $0.** The only accounts needed are GitHub, Vercel, Supabase, Mapillary (token) and Openverse (client).

## 7. Data (Supabase)

Profiles, frescoes, an owner-only table for exact locations, and reports; a private `sketchbook` bucket and a public `globe` bucket. The public pin is derived by the database (exact or snapped to ~550 m), so the exact spot never leaks. Full schema with Row Level Security: `schema.sql` (tested in `schema.test.mjs`).

## 8. Scope for GIBC (deadline Oct 1, 23:45 PHT)

| Must have | If time allows | After the hackathon |
|---|---|---|
| Capture + GPS pin · draw with layers/undo · reference panel (Openverse) · save to Sketchbook · publish to globe with exact/neighborhood pin · clustered globe · fresco viewer with Reality ↔ Drawing slider · Same Wall strip · license on references · Report + unpublish | Street-level view (Mapillary/Panoramax) · angle chips · nsfwjs check · weather line | Doodle-to-word suggestions · "respond to this fresco" · place timelines (same wall over years) · collections / stories · AR |

**Demo safety:** pre-seed ~20 public frescoes across a few cities (the team's own), so the globe never looks empty on stage.

## 9. Risks

- **Time:** this is a pivot with ~4.5 days left. Cut from the right-hand columns first; never cut capture → draw → save → globe → viewer.
- **Location privacy:** exact pins can expose homes. Default to *neighborhood*, strip EXIF from every upload, and warn before publishing an exact spot.
- **Free-tier limits:** 1 GB storage and 5 GB egress; compress images and serve thumbnails on the globe.
- **Street-level coverage gaps:** Mapillary is sparse in some areas; the viewer must look complete without it.
- **Hackathon rules:** GIBC disqualifies work "substantially the same as a previous hackathon entry." Keep this separate from whatever the team submits to FirstCommit.

## 10. Pitch lines

- *"What if your art didn't live in a gallery, but where you made it?"*
- *"Every place has a wall. Sinopia lets you draw on it."*
- *"Same wall, different eyes."*

## Sources checked
Supabase pricing · Vercel pricing · OpenFreeMap · MapLibre globe docs · Mapillary API docs and CC BY-SA help page · Panoramax · Openverse throttling docs · tldraw license docs · GIBC V2 rules.
