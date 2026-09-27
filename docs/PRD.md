# Sinopia: Product Requirements

*Sinopia* is the reddish underdrawing a fresco painter sketched on the wall before painting. In this app, the real world is the wall.

| | |
|---|---|
| Version | 1.0 |
| Status | Ready to build (open decisions in `DECISIONS.md`) |
| Owner | Ian Patrick Flores (Jum) and team |
| Updated | 2026-09-27 |
| Event | Global Innovation Build Challenge V2, Track 03 (Open). Deadline **Oct 1, 2026, 23:45 UTC+8 (PHT)**. Judged on **Creativity, Execution, Impact, Presentation** |
| Budget | **$0**: free tiers and open-source only, no credit card anywhere (NFR-003) |

> **Draw on the real world. Leave it where you found it.**

## 1. Summary

Sinopia is a place-based drawing app. You photograph a real place, draw your own interpretation over the photo, and keep the result, a **fresco**, either privately in your **Sketchbook** or publicly on a shared **globe**, pinned where you took the photo. While drawing, a **reference panel** finds openly licensed photos of anything you're drawing, so you can draw a fire hydrant, a shiba inu or a jeepney without leaving the canvas. Anyone can explore the globe, open a fresco, slide between the real photo and the drawing, see the street-level view of that spot, and browse other frescoes made at the same place (**Same Wall**).

## 2. Problem

- Artists who draw over photos or sketch on location have nowhere that keeps **the place, the photo and the drawing together**. Their work ends up in camera rolls and social feeds organised by date and likes, detached from where it happened.
- Drawing an unfamiliar object into a scene means leaving the canvas to search for references, losing flow, and often landing on images with unclear licenses.
- Places have no visual memory of how people imagined them. Maps show where things are and photo apps show what they looked like, but nothing shows how different people reinterpreted the same corner.

*Evidence status:* the team's own experience as student artists. Five artist reactions to the working demo are planned before the video (IMPLEMENTATION_PLAN, Phase 5).

## 3. Users

- **Primary:** art students and hobby artists who draw over photos or sketch on location (mobile-first).
- **Secondary:** people exploring a place through how others drew it: travellers, locals, classmates, judges.

## 4. Goals and non-goals

**Goals**
- G-1: Go from a real photo to a finished drawing on it, on a phone, in one sitting.
- G-2: Get a reference for anything you're drawing without leaving the canvas.
- G-3: Keep every fresco tied to its place and time, privately or publicly, under the artist's control.
- G-4: Let anyone explore the world through frescoes: globe → place → fresco → the real spot → other frescoes of the same spot.

**Non-goals (MVP):** likes, follower counts, feeds or rankings; comments or chat; AI image generation; AR; a full Photoshop-style editor; native mobile apps (it's a mobile-first web app / PWA); paid services of any kind.

## 5. Vocabulary

| Term | Meaning |
|---|---|
| **Sinopia** | A drawing in progress (a draft) |
| **Fresco** | A finished piece: original photo + drawing layer + place + time + text |
| **Sketchbook** | The artist's private album of frescoes |
| **Globe** | The public world map of published frescoes |
| **Same Wall** | All public frescoes made within ~50 m of a spot |

## 6. Scope

| MVP | If time allows | Later |
|---|---|---|
| Sign in · capture photo + GPS pin · draw (brush, eraser, colors, size, opacity, 3 layers, undo/redo) · reference panel (search anything, license on each result) · save to Sketchbook · publish/unpublish to globe with pin precision · globe with clustered pins · fresco viewer with Reality ↔ Drawing slider · Same Wall strip · report · seeded demo frescoes | Street-level view of the spot (Mapillary, Panoramax fallback) · angle chips on references · in-browser safety check before publishing · weather at capture · PWA install | Suggest reference words from your strokes · "draw this wall too" responses · place timelines · collections and stories · AR |

## 7. User journeys

1. **Make a fresco.** Tap **New** → take or upload a photo → the pin drops from the photo's GPS (or the phone's location); drag to fix it → draw → open **Reference**, type "fire hydrant", keep the panel open beside the canvas while drawing → **Finish**: title, optional caption and memory, tags → **Keep in Sketchbook** or **Publish to Globe** (choose *exact spot* or *neighborhood*).
2. **Explore.** Open the globe → spin to Japan → zoom into Tokyo → tap a cluster → tap a pin → the fresco viewer opens: drag the slider from the real photo to the drawing → see the street-level view of the spot → scroll Same Wall to other artists' frescoes of that corner → open one.
3. **Sketchbook.** Open **Sketchbook** → browse your frescoes as a carousel grouped by place or month → open one → edit text, change pin precision, publish or unpublish, delete.
4. **Report.** On someone else's fresco → **Report** → pick a reason → it disappears from the globe for everyone until the team reviews it.

## 8. Functional requirements

| ID | Requirement |
|---|---|
| FR-001 | **Sign in** with Google or GitHub (Supabase Auth). Browsing the globe and viewing public frescoes needs no account. |
| FR-002 | **Capture:** take a photo (camera) or upload JPG/PNG/HEIC-converted-by-browser ≤ 15 MB. Read GPS and capture time from EXIF; if missing, offer the device's current location or a pin placed on a map. The pin is always draggable before saving. |
| FR-003 | **Image preparation:** in the browser, resize to ≤ 1600 px on the long side and re-encode as WebP (this also strips EXIF metadata, including GPS); make a 400 px thumbnail. |
| FR-004 | **Draw:** freehand brush with pressure-like smoothing, eraser, color picker with recent colors, size, opacity, 3 drawing layers above the photo, undo/redo (≥ 50 steps), pinch-zoom and pan, clear layer. The photo is never modified. Autosave the draft (sinopia) locally every 10 s. |
| FR-005 | **Reference panel:** a search box for any subject; results from Openverse in a side panel (bottom sheet on phones) that stays open while drawing; tap a result to enlarge; each result shows license, creator and source link. Optional angle chips run extra searches ("… side view", "… from above", "… close-up"). |
| FR-006 | **Finish:** title (required, ≤ 80 chars), caption (≤ 500), "what I remember" (≤ 1,000), up to 5 tags, place name (auto from reverse geocoding, editable). |
| FR-007 | **Save privately:** upload photo, drawing layer (transparent WebP), composite and thumbnail to the private Sketchbook bucket; create the fresco record with visibility `private`; store the exact point in the owner-only location table. |
| FR-008 | **Publish / unpublish:** publishing copies the four images to the public bucket and sets visibility `public` with a pin precision: `exact` or `neighborhood` (snapped to a ~550 m grid). Default is `neighborhood`; choosing `exact` shows a one-line warning. Unpublishing removes the public copies and the public point. |
| FR-009 | **Globe:** a 3D globe with clustered pins of public frescoes; zoom from world to street level; tapping a cluster zooms in; tapping a pin opens a preview card (thumbnail, title, artist, place). Place search box. |
| FR-010 | **Fresco viewer:** the composite with a **Reality ↔ Drawing slider** (photo only ↔ photo + drawing), title, artist, place, date, caption, memory, tags, and a small map of the spot. |
| FR-011 | **Same Wall:** in the viewer, a strip of other public frescoes within 50 m of this fresco's public point, nearest first, up to 24. Empty state explains that nobody else has drawn here yet. |
| FR-012 | **Sketchbook:** the owner's frescoes as a carousel/grid, grouped by place or month; open, edit text, change precision, publish/unpublish, delete (with confirmation). |
| FR-013 | **Report:** signed-in users can report a public fresco (reason ≤ 300 chars). One report hides it from others until reviewed (hackathon policy, D-010). |
| FR-014 | **Seeded demo:** ≥ 20 public frescoes by the team across ≥ 5 cities, so the globe is populated during judging. |
| FR-015 *(if time)* | **Street-level view:** in the viewer, the nearest Mapillary image within 60 m of the public point, in an embedded viewer beside the fresco; fallback to Panoramax; if neither exists, show the map only with "No street-level imagery here yet". Never shown for `neighborhood` precision (it would reveal nothing useful and could hint at the exact spot). |
| FR-016 *(if time)* | **Safety check:** before publishing, run an in-browser image classifier on the composite; if it flags explicit content, block publishing with an explanation. |
| FR-017 *(if time)* | **Weather at capture:** add "light rain, 24°C" from Open-Meteo's historical data for the capture time and place. |

## 9. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-001 | **Privacy:** exact GPS is readable only by the owner (separate table + RLS). Public frescoes expose only the chosen precision. Uploaded images carry no EXIF metadata. Private frescoes are unreadable to anyone but the owner, enforced by the database and storage policies, not the UI. |
| NFR-002 | **Performance (mid-range Android on 4G):** first paint ≤ 2.5 s; globe interactive ≤ 4 s; drawing latency ≤ 16 ms per stroke segment; reference results ≤ 2 s. |
| NFR-003 | **Cost:** $0. Only free tiers and open-source libraries; no service that needs a credit card. Stay under Supabase Free limits (500 MB DB, 1 GB storage, 5 GB egress/month) by compressing images (~300 KB composite, ~40 KB thumbnail). |
| NFR-004 | **Licensing:** every reference shows its license, creator and source link as reported by Openverse, with the statement "License information is as reported by the source; check it before reuse." Map attribution for OpenStreetMap/OpenFreeMap (and Mapillary when used) is always visible. |
| NFR-005 | **Security:** only the Supabase anon key ships to the browser; the service-role key and Openverse client secret live in server-side environment variables. Inputs validated in the database (length checks) and in the UI. |
| NFR-006 | **Accessibility:** WCAG 2.2 AA contrast; every control reachable by keyboard; 44 px touch targets; slider operable by keyboard; alt text = fresco title + place; honors reduced motion. |
| NFR-007 | **Availability:** Supabase Free pauses after 7 days without activity. Keep it active through judging (open the app every few days or use a scheduled ping, `DECISIONS.md` D-012). |

## 10. Data

- **Fresco:** id, owner, title, caption, memory, tags, visibility, pin precision, public point (derived), place name, captured time, image paths (photo, drawing, composite, thumbnail), moderation state, report count, timestamps.
- **Fresco location:** fresco id, owner, exact point. Owner-only.
- **Profile:** id, display name.
- **Report:** fresco, reporter, reason, time. Readable only by the team.
- **Images:** private `sketchbook` bucket and public `globe` bucket, paths `<owner>/<fresco>/<file>.webp`.
- **Drafts (sinopias):** stored in the browser (IndexedDB) until finished; never uploaded.
- **Deletion:** deleting a fresco removes its rows and both buckets' files; deleting an account cascades to everything.

Full schema: `docs/schema.sql`.

## 11. AI and model use

No generative AI. Optional in-browser models only: an image-safety classifier before publishing (FR-016). Reference search, geocoding and maps are ordinary APIs. Sinopia never generates or alters artwork.

## 12. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Pivot with ~4.5 days left | High | High | Tight MVP; cut the "if time" column first; feature freeze Sep 30 18:00 PHT |
| Exact pins reveal homes | Medium | High | Default `neighborhood`; warning on `exact`; EXIF stripped; exact point owner-only |
| Offensive public uploads | Medium | High | Sign-in required to publish; report hides instantly; optional in-browser safety check; team review in the Supabase dashboard |
| Globe looks empty on stage | High | High | FR-014 seeded frescoes |
| Free-tier limits (storage, egress, inactivity pause) | Medium | High | Compression, thumbnails on the globe, keep-alive during judging |
| Third-party API down or rate-limited (Openverse, Nominatim, Mapillary) | Medium | Medium | Each has a graceful fallback (UX_MAP); cache reference results for 24 h; never block saving on them |
| Drawing feels laggy on phones | Medium | High | Konva + Perfect Freehand on one active layer; test on a real mid-range phone in Phase 1 |
| Overlap with the team's FirstCommit entry | ? | High | GIBC disqualifies work "substantially the same as a previous hackathon entry"; keep the entries distinct (D-004) |

## 13. Definition of Done (GIBC V2)

- MVP scope works end to end at a public URL on a phone and a laptop, with ≥ 20 seeded frescoes.
- Public repo with a README containing setup instructions; repo state at the deadline is what's judged.
- 2–5 minute demo video (YouTube, Vimeo or Youku) with English audio or subtitles.
- At least 3 screenshots.
- Devpost description with a complete "Built With" list (every library, API and dataset in ARCHITECTURE §6) and all team members by real full name, each with a Devpost account added to the submission.
- Submitted by **Oct 1, 15:00 PHT** (8 h before the deadline).
