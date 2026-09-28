# Sinopia: Screens

Status: **Locked and in the build** · 2026-09-27, applied to `web/` 2026-09-28 · Built against `DESIGN_BRIEF.md` (locked) and the team's `UX_MAP.md` (routes, states and copy rules).
Where a screen here and the code disagree, fix whichever is wrong and log it in `DESIGN_BRIEF.md`.

Every screen inherits the global do-nots in `DESIGN_BRIEF.md` §11: one yellow button per screen, no blurred shadows or glass, no side-stripe callouts, handwriting never in long text, no lined paper or yellow around photos.

---

## Globe · `/`
**Purpose:** find frescoes by place.
**Layout:** a full-bleed globe drawn in ink. A floating search bar at the top (paper, ink, offset). Zoom +/− on the right edge. The attribution line sits bottom-right, always visible. The nav is a bottom bar on phones and a left rail on laptops. The preview card is a lined-paper card: bottom-docked on phones, bottom-right on laptops.
```
[ Search a place             ]
            (   globe   )     [+]
         ▣  (5)    ▣          [−]
                     attribution
[preview card: thumb · title · Open]
[ Globe   ( + New )   Sketchbook ]
```
**Primary action:** tap a pin (→ preview → Open).
**Visual priority:** 1) frescoes on the globe 2) search 3) New 4) zoom 5) attribution.
**States (UX_MAP):** loading = plaster sphere with "Loading the gallery…" · map fails = a notice plus a plain list of frescoes · no search result = one line naming the query · a cluster that can't split = the Same-spot sheet.
**Do not:** auto-spin, a glow or atmosphere halo, arcs between pins, teardrop pins, a second yellow button (Open lives in the card; New is a paper button).

## Sign-in sheet (at New, at Report, in Sketchbook)
**Purpose:** get an account at the moment it's needed.
**Layout:** a lined sheet with the title "Sign in to draw", one sentence on why, "Continue with Google" and "Continue with GitHub" as full-width paper buttons, and a small note.
**Primary:** Google or GitHub (equal weight, so neither is yellow).
**Do not:** brand-colored logo buttons, or signing people in on the globe before they ask.

## Capture · `/new`
**Purpose:** get a photo and where it was taken.
**Layout:** a lined page. The heading "Start with a real place", then stacked option cards: Take a photo · Upload a photo · Resume your sinopia (only if a draft exists) · (demo only) Try a sample street. A status area sits below.
**Primary:** Take a photo.
**States:** "Reading photo…" · not an image · over 15 MB (names the size and the limit) · HEIC the browser can't open · **no GPS in the photo** → a notice with Use my location / Place on map · location denied → "Place the pin on the map instead."
**Do not:** a dashed "drop zone" as the main UI on phones, or file-type jargon.

## Pin check · `/new/pin`
**Purpose:** confirm where the photo was taken.
**Layout:** a full-bleed map with a **fixed center pin** (drag the map, not the pin). A top card shows the photo thumbnail and where the location came from ("From your photo's location" / "Placed by you"). The bottom dock shows the place name, **Confirm spot** (yellow) and Use my location.
**Primary:** Confirm spot.
**States:** place-name lookup fails → "No place name here yet. You can add one when you finish." · location denied → one line.
**Do not:** confirm silently without showing where the location came from.

## Canvas (the sinopia) · `/new/draw`: anchor screen
**Purpose:** draw over the photo.
**Layout (phone):** a top bar (close · save status · undo · redo · **Finish**), the canvas filling the middle, the reference sheet in the page flow (closed / peek / half) *above* the tray, and a 6-tool tray at the bottom (Brush · Eraser · Color · Size · Layers + badge · Refs). **Laptop:** the tray becomes a left rail and the reference panel docks on the right at 340 px.
**Primary:** drawing. Finish is enabled once there's at least one stroke.
**Visual priority:** 1) canvas 2) current tool and color 3) undo/redo 4) Refs 5) Finish 6) everything else.
**States:** first-time 3-step hint · "Continuing your sinopia from 10:42" · draft kept / not being saved · hidden-layer warning · clear-layer inline confirm (undoable) · references: suggestions, 6 skeletons, stand-ins, pinned references.
**Do not:** let anything cover the canvas without shrinking it, use `backdrop-filter`, put a camera button here, or add stacked FABs.

## Finish · `/new/finish` (also *Edit words*)
**Purpose:** name it and choose who sees it.
**Layout:** a lined page. The composite thumbnail + "Drawn over your photo at … · date". Then Title (counter /80, required), Place (from the pin, editable), Caption (/500), **What I remember** (text sits on the notebook lines), Tags (up to 5). Then **Who can see it?** (Only me / Everyone). If Everyone: **How exact is the pin?** (Neighborhood default / Exact spot + warning) with a mini map of what the public sees. A sticky action bar holds **one yellow button whose label follows the choice**.
**Primary:** Keep in Sketchbook / Publish to Globe.
**States:** missing title ("Give it a title. It can be short.") · over-length counters · per-image upload progress · success → Sketchbook + toast, or the globe flies to the new pin and the ink circle draws around it.
**Do not:** two yellow buttons, a bare on/off toggle for privacy, or hiding the exact-spot warning.

## Fresco viewer · `/f/:id`
**Purpose:** see the drawing against the real place.
**Layout (phone):** a top bar (back · place · Report), the artwork in its own aspect ratio (max 62 vh), the **Reality ↔ Drawing** fade slider right under it, then the details: demo badge (stand-ins only) · title (Gochi) · by · place and date · status (owner) · caption · What I remember (on lines) · tags · Where (mini map + precision) · owner actions · **Same Wall** strip. **Laptop:** the art and slider are sticky on the left; the details are on the right.
**Primary:** drag the slider.
**States:** not available ("This fresco isn't available." + Back to globe) · Same Wall empty ("Nobody else has drawn this wall yet.") · private: Same Wall explains it appears once the fresco is published · owner: Edit words · Unpublish / Publish · Pin precision · Delete (confirm naming the fresco).
**Do not:** a wipe handle with chevrons, "Before/After" pills, or Report on your own fresco.

## Sketchbook · `/sketchbook`
**Purpose:** find and manage your own frescoes.
**Layout:** a lined page. The heading + "Signed in as · Sign out · About & credits". Group by **Place / Month**. **Sinopias** (the unfinished draft, "On this device only") go first, then one horizontal shelf per group with fresco cards showing "Only me" / "On the globe".
**Primary:** open a fresco.
**States:** signed out (sign in) · empty ("Your Sketchbook is empty. Tap New to make your first fresco.") · no draft (the section is hidden).
**Do not:** a bento or masonry grid, like counts, or treating drafts as frescoes.

## Report sheet
**Purpose:** pull harmful content fast.
**Layout:** reasons as radio rows, optional text (/300), one line on what happens, **Send report** (yellow).
**States:** sending · "Thanks. It's hidden while we review it." → Back to globe.

## About & credits (sheet)
Tagline, one line on what a sinopia is, and credits for fonts, icons, map data, the yellow and the demo stand-ins. This doubles as the Devpost "Built With" checklist.

---

## Cross-screen consistency check (Phase E)
- The same tokens, the same 2 px ink edge and the same offset rule appear on all 10 surfaces. No screen invents its own card or button.
- Exactly one yellow button per screen: Canvas (Finish) · Pin (Confirm) · Finish (Keep/Publish) · Report (Send) · Preview (Open). The Globe and Viewer use yellow only for pins, clusters and the slider thumb.
- Lined paper appears on the Capture, Finish and Sketchbook pages and on sheets and popovers. It never appears behind the photo, the canvas, the globe or the art.
- Handwriting is used for titles, labels and buttons. Karla is used for every caption, memory, license line, error and date.
