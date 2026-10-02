# Sinopia — Feature Expansion Product Requirements Document

**Project:** Sinopia  
**Product:** Location-based creative platform for artists  
**Document:** Feature Expansion PRD  
**Version:** 1.0  
**Status:** Ready for implementation planning  
**Primary scope:** Draw This Wall, Place Timeline, Sketch Missions, Collaborative Fresco  
**Target platform:** Responsive web app / PWA  
**Repository:** `https://github.com/Muj-csv/Sinopia`  
**Deployment:** `https://sinopia.vercel.app/`

---

## 1. Product Summary

Sinopia is a location-based creative platform where artists photograph real places, draw their interpretation on top of those places, save the result as a fresco, and explore artworks through an interactive globe. The current product already supports capture with location, drawing tools, references, private Sketchbook storage, public Frescoes/Sinopia publishing, artist globes, a Reality ↔ Drawing viewer, Same Wall discovery, street-level imagery, weather-at-capture metadata, reporting, and privacy controls for public location precision.

The next product phase should deepen the relationship between **artists, places, and time** rather than turning Sinopia into a conventional social network.

The four priority features in this PRD are:

1. **Draw This Wall** — create a new interpretation of an existing public fresco/location.
2. **Place Timeline** — explore how a place has been drawn across different dates and years.
3. **Sketch Missions** — location-aware creative prompts that encourage observation and drawing in the real world.
4. **Collaborative Fresco** — combine multiple independently attributed artist contributions into one shared location-based artwork.

The intended product loop is:

> **Discover a place → draw it → respond to it → collaborate → preserve every interpretation → see the place through time.**

The strategic product idea behind this expansion is:

> **Same place → different eyes → over time.**

---

## 2. Current Product Baseline

The current repository describes Sinopia as a location-based creative platform where artists draw over real places and explore finished frescoes through an interactive globe.

Current documented functionality includes:

- Photo capture/upload with GPS information and a draggable location pin.
- Drawing over the photo using brush, eraser, colors, layers, undo/redo.
- Openly licensed reference discovery through Openverse with source/license metadata.
- Private Sketchbook.
- Publishing a fresco publicly at exact or neighborhood-level public location precision.
- An artist's personal Sinopia globe containing their frescoes.
- Exploration of other artists' Sinopias.
- Spatial drawing around the globe.
- Profile and drawn avatar customization.
- Fresco viewer with Reality ↔ Drawing comparison.
- Same Wall discovery for nearby frescoes.
- Street-level imagery beside the fresco.
- Reporting and an in-browser safety check before publishing.
- Weather metadata at capture.
- Privacy separation between exact owner-only location and public location.

The repository uses TypeScript, Vite, React, PWA tooling, Konva, Perfect Freehand, Supabase/Postgres/PostGIS, Vercel, MapLibre GL JS, OpenStreetMap/OpenFreeMap, Nominatim, Photon, Openverse, Mapillary/Panoramax, nsfwjs/TensorFlow.js, Open-Meteo, Vitest, Playwright, and PGlite for the existing product stack.

### Important product-documentation decision

The expanded PRD supersedes any older product documentation that describes Sinopia as a gesture-drawing anatomy or pose-analysis product. This document assumes the **current location-based Sinopia** is the product direction.

---

## 3. Product Vision

### Vision

Build a living visual archive of places, created by the people who observe them.

### Product promise

Sinopia should allow an artist to say:

> “I was here, I saw this, and I left my interpretation here.”

Another artist should then be able to say:

> “I saw the same place differently.”

Over time, Sinopia should preserve both viewpoints and make their history explorable.

### What Sinopia is not

Sinopia should not become a generic social network optimized around:

- likes
- follower counts
- engagement scores
- popularity rankings
- algorithmic artist competition
- generic image feeds
- AI-generated artwork replacing human work

The **place** should remain the primary organizing object. Artists remain visible and credited, but popularity should not determine what a place means or which interpretation is valid.

---

## 4. Problem Statement

Current location-based artwork can be difficult to connect into a persistent creative experience.

An artist may create a sketch, post it online, and receive reactions, but the relationship between the sketch and its physical place can disappear inside a conventional feed.

Sinopia's existing location-aware architecture provides an opportunity to solve a different problem:

> **How can artists preserve, discover, compare, and build upon different human interpretations of the same real-world place?**

The feature expansion addresses four gaps:

### Gap A — A viewer can discover nearby art but has limited ways to respond creatively.

**Solution:** Draw This Wall.

### Gap B — A place can contain multiple sketches, but their history is not yet presented as a temporal story.

**Solution:** Place Timeline.

### Gap C — Artists can draw, but the product needs stronger reasons to physically explore and observe.

**Solution:** Sketch Missions.

### Gap D — Artists can work independently, but there is no structured object for a multi-artist location artwork.

**Solution:** Collaborative Fresco.

---

## 5. Goals and Success Criteria

### Product goals

1. Increase meaningful interactions between artists without relying on conventional social-media mechanics.
2. Make the physical location the central object of discovery.
3. Increase the number of public frescoes created at shared locations.
4. Encourage users to leave the digital interface and observe/draw real places.
5. Preserve independent artistic authorship while supporting collaboration.
6. Create a foundation for long-term place-based visual history.
7. Reuse the existing capture, fresco, location, globe, viewer, and privacy architecture wherever possible.

### Primary success signals

These are product metrics, not vanity metrics:

- Percentage of public frescoes that receive at least one valid interpretation.
- Number of unique locations containing 2+ artist interpretations.
- Percentage of weekly active artists who complete at least one mission.
- Number of collaborative frescos with contributions from 2+ distinct artists.
- Median number of interpretations per active shared location.
- Percentage of users who return to a location or timeline after their first visit.
- Completion rate from “discover fresco” → “draw this wall”.
- Completion rate from “mission opened” → “fresco submitted”.
- Number of public frescoes successfully grouped into place timelines.

### Guardrail metrics

The product should also monitor:

- location-privacy incidents
- reports per 100 public frescoes
- failed uploads/publishing
- abandoned drawing sessions after starting a mission
- duplicate or spam mission submissions
- collaborative contribution conflicts

---

## 6. Target Users

### Primary — Urban / Location Artists

Artists who sketch architecture, streets, people, landscapes, travel scenes, or local places and care about capturing the feeling of being somewhere.

Needs:

- simple capture workflow
- contextual reference material
- a place to preserve sketches
- discovery of other artists
- useful creative prompts
- portfolio value
- control over public location precision

### Secondary — Casual Creative Explorers

People who do not identify as professional artists but enjoy drawing, travel, visual journaling, or creative challenges.

Needs:

- low-pressure prompts
- nearby activities
- simple drawing experience
- discovery without requiring a polished portfolio

### Secondary — Art and Education Communities

Schools, art clubs, workshops, architecture groups, community organizations, and sketching groups.

Needs:

- group activities
- shared locations
- collaborative output
- challenge structure
- attribution
- simple event-like workflows

### Secondary — Place / Heritage Audiences

Users interested in seeing how streets, landmarks, neighborhoods, or cultural spaces are interpreted over time.

Needs:

- place-based browsing
- temporal history
- multiple viewpoints
- contextual metadata

---

## 7. Core Experience Principles

### 7.1 Place first

A place is a first-class object in the experience. An artwork is always understood in relation to where and when it was made, subject to the artist's privacy settings.

### 7.2 Art first

Features should support human observation and creation. No feature should require generative AI artwork.

### 7.3 Attribution by default

Every contribution must remain associated with its artist.

### 7.4 Non-destructive collaboration

One artist's work must never be silently overwritten by another artist.

### 7.5 Privacy by design

Exact owner location must remain protected by the existing owner-only location model. New features must never expose exact coordinates through public queries unless the fresco owner has explicitly selected exact public pin visibility.

### 7.6 Low-pressure participation

Mission participation and social interaction should not require competition or popularity ranking.

### 7.7 Mobile-first, desktop-capable

Drawing and exploration must work on phones, tablets, laptops, and desktop browsers.

---

# 8. Feature 1 — Draw This Wall

## 8.1 Overview

**Draw This Wall** allows a user to create a new fresco inspired by an existing public fresco or shared place. The new artwork inherits the original **public place context**, not the original artist's private information.

The feature converts Same Wall from a passive gallery into a creative interaction loop.

Core phrase:

> **Draw this place through your eyes.**

---

## 8.2 User story

> As an artist viewing a public fresco, I want to draw the same place from my own perspective so that I can contribute another interpretation without changing the original artist's work.

### Secondary user stories

> As an artist, I want my response linked to the original fresco so viewers can understand the creative relationship.

> As a viewer, I want to see all interpretations of the same place together.

> As an artist, I want the system to preserve my independent authorship and metadata.

---

## 8.3 Entry points

The action must be available from:

1. Fresco viewer.
2. Same Wall view.
3. Place Timeline.
4. Shared-location detail page.
5. A Sketch Mission that points to a specific place.

Primary CTA:

**DRAW THIS WALL**

Optional supporting copy:

**Draw this place through your eyes.**

---

## 8.4 Functional requirements

### DTW-FR-01 — Eligibility

Only public, visible, moderation-approved frescoes may expose the public Draw This Wall action.

Private frescoes must never be used as public response anchors.

### DTW-FR-02 — Preserve location context

When the user starts Draw This Wall, the app should carry forward:

- public location
- place name, when available
- original fresco ID
- optional mission ID

The new fresco should not inherit the original artist's owner-only exact location.

### DTW-FR-03 — Independent artwork

The resulting response is a new fresco with:

- new fresco ID
- new owner ID
- new title/caption/memory/tags
- new drawing/composite assets
- new capture timestamp
- its own privacy setting

### DTW-FR-04 — Reference context

The drawing screen may show the source fresco as an optional visual reference.

The source reference must never be flattened into the user's saved photo as if it were their own artwork.

### DTW-FR-05 — Attribution

The viewer must show:

- original artist
- responding artist
- relationship between artworks

Example:

**Inspired by Ian's “Old City Hall”**

### DTW-FR-06 — Same-place grouping

A Draw This Wall response must be discoverable through the same-location experience when its public location and moderation state permit it.

### DTW-FR-07 — Parent/response relationship

The system must retain the original fresco relationship independently from geospatial proximity.

This is important because two artworks can be creatively related even if the public location has been snapped to a neighborhood-level point.

### DTW-FR-08 — No forced copy

The user must be allowed to redraw the place in any supported artistic style or medium.

The system must not require a visual copy of the original.

### DTW-FR-09 — Original remains immutable

Creating a response must not alter the source fresco, its files, its metadata, its visibility, or its attribution.

### DTW-FR-10 — Privacy inheritance rule

The child fresco's public location precision must be selected independently.

Suggested default:

- inherit the source's public place context for drawing convenience
- default the new fresco to the user's normal safe pin precision
- never automatically expose the user's exact capture location

### DTW-FR-11 — Unpublish behavior

If the source fresco becomes private, deleted, or moderation-blocked after a response has been created:

- the response remains the user's own artwork
- the public relationship label must gracefully degrade
- the source artwork must no longer appear where its visibility rules prohibit access

### DTW-FR-12 — Reporting

A response remains subject to existing report and moderation mechanisms.

---

## 8.5 Suggested UI

### Fresco viewer

```text
┌──────────────────────────────────────────┐
│ REALITY ↔ DRAWING                        │
│                                          │
│           [ Fresco artwork ]             │
│                                          │
│ Old City Hall                             │
│ Ian · 2026                                │
│                                          │
│ [ DRAW THIS WALL ]                       │
│ [ VIEW SAME WALL ]                       │
└──────────────────────────────────────────┘
```

### Drawing entry screen

```text
DRAW THIS PLACE

Original artwork
[ thumbnail ]

Place
Old City Hall

Reference: Ian's interpretation

[ USE PHOTO AS USUAL ]
[ START DRAWING ]
```

---

## 8.6 Acceptance criteria

- A user can start a response from a public fresco.
- The new work is stored as a distinct fresco.
- The source fresco remains unchanged.
- The response contains a persistent source relationship.
- The response can be shown with other works at the same place.
- The response does not expose the source owner's private GPS.
- The response can be published with its own privacy settings.
- Source removal/privacy changes do not delete the responder's artwork.
- Public and private RLS behavior remains correct.

---

# 9. Feature 2 — Place Timeline

## 9.1 Overview

Place Timeline presents frescoes as a historical visual sequence rather than only as nearby results.

The same physical place can be explored across:

- year
- date
- artist
- medium/style metadata where available
- individual interpretations

Core phrase:

> **See this place through time.**

---

## 9.2 User story

> As a viewer, I want to see how artists have drawn the same place across different dates so that I can explore how a place is experienced and represented over time.

### Secondary user stories

> As an artist, I want my fresco to become part of the visual history of the place where I drew it.

> As a community member, I want to compare different years of a recognizable location.

---

## 9.3 Place identity model

A place timeline must not depend on exact GPS equality.

The system should support a **place group** based on:

- geographic proximity
- public place information
- optional explicit place identifier
- optional user-created/shared place

A place group is a logical collection. It is not a statement that every image was captured from the exact same camera position.

### Initial MVP rule

Use a configurable geographic radius around a public point. The first implementation can reuse the existing Same Wall concept and radius, with a place-group layer added above it.

For example:

- Same Wall: short radius for direct local comparison.
- Place Timeline: larger configurable place radius or explicit place grouping.

The exact thresholds must be configurable rather than hard-coded into the UI.

---

## 9.4 Functional requirements

### PT-FR-01 — Place view

A place can be opened from:

- globe/map
- fresco viewer
- Same Wall
- mission
- search/location result

### PT-FR-02 — Timeline grouping

Public, moderation-approved frescoes belonging to a place group must be grouped chronologically.

### PT-FR-03 — Year navigation

Users can navigate by year.

Minimum interaction:

```text
2018 ── 2020 ── 2023 ── 2025 ── 2026
                         ●
```

### PT-FR-04 — Date detail

The viewer should expose precise capture date/time when the fresco owner has provided it and the metadata is appropriate to display.

### PT-FR-05 — Comparison

Users can compare two or more time points.

MVP comparison:

- select earlier fresco
- select later fresco
- open side-by-side or slider view

### PT-FR-06 — Interpretation mode

The place timeline should clearly distinguish:

- same place
- same artist
- same wall / nearby
- response relationship

These concepts must not be visually conflated.

### PT-FR-07 — Empty state

When a place has only one fresco:

> **You're the first sketch here.**

or equivalent neutral copy.

The UI should invite the viewer to create another interpretation where appropriate.

### PT-FR-08 — No exact-location leakage

The timeline must only use the public-safe location representation available to the viewer.

### PT-FR-09 — Moderation filtering

Private, deleted, or moderation-hidden frescoes must not appear in the public timeline.

### PT-FR-10 — Performance

The timeline must support paginated or bounded queries for places with many artworks.

### PT-FR-11 — Place summary

The place detail should show useful aggregate metadata:

- number of frescoes
- number of participating artists
- earliest public artwork date
- latest public artwork date
- approximate place name

### PT-FR-12 — Draw action

When a user views a place timeline, provide:

**DRAW THIS PLACE**

This should open the standard capture/draw flow with place context preserved.

---

## 9.5 Suggested UI

```text
┌────────────────────────────────────────────────┐
│ ESCOLTA · MANILA                               │
│ 14 frescoes · 8 artists                        │
│                                                │
│ 2018 ── 2020 ── 2023 ── 2025 ── ● 2026        │
│                                                │
│ ┌──────────────┐  ┌──────────────┐             │
│ │ 2026         │  │ 2026         │             │
│ │ Ian · Ink    │  │ Maria ·      │             │
│ │              │  │ Watercolor   │             │
│ └──────────────┘  └──────────────┘             │
│                                                │
│ [ COMPARE YEARS ] [ DRAW THIS PLACE ]         │
└────────────────────────────────────────────────┘
```

---

## 9.6 Acceptance criteria

- Public frescoes can be grouped into a place timeline.
- Timeline results are chronologically navigable.
- Users can compare at least two selected frescoes.
- Hidden/private artworks never leak into public timeline results.
- Location privacy rules remain unchanged.
- Large timelines do not require downloading every fresco at once.
- The user can initiate a new fresco from the place timeline.

---

# 10. Feature 3 — Sketch Missions

## 10.1 Overview

Sketch Missions are creative prompts tied either to a geographic area or to a specific place.

The feature is designed to increase real-world observation and give users a reason to return without introducing popularity competition.

Example mission:

> **Something Ordinary**  
> Find something people normally walk past and give it your attention.

---

## 10.2 Mission types

### Type A — Global mission

Available to all users.

Example:

> Draw a doorway that tells a story.

### Type B — Regional mission

Visible to users in a defined region.

Example:

> Draw something unique to your city.

### Type C — Radius mission

Available within a geographic area.

Example:

> Within 2 km, draw a place you usually ignore.

### Type D — Exact-place mission

Points participants to one location.

Example:

> Everyone interprets the same landmark from their own perspective.

### Type E — Same-place mission

Combines directly with Draw This Wall.

Example:

> Draw this place without copying the first artist.

---

## 10.3 Mission object

A mission should contain:

- mission ID
- title
- prompt
- description
- mission type
- status
- start time
- optional end time
- optional geographic center
- optional geographic radius
- optional place ID
- optional target fresco ID
- participant count
- optional submission limit
- creator/system origin
- created timestamp

---

## 10.4 Functional requirements

### SM-FR-01 — Mission discovery

Users can discover missions from:

- home/globe entry
- dedicated Missions page
- nearby location experience
- place timeline
- optional profile/achievement section

### SM-FR-02 — Mission card

A mission card should show:

- title
- short prompt
- scope
- active period
- approximate participant count
- optional distance
- CTA

### SM-FR-03 — Mission details

The mission detail view includes:

- complete prompt
- rules
- location requirements
- time requirements, if any
- examples or reference guidance, if supplied
- participant submissions
- Start Mission CTA

### SM-FR-04 — Mission start

Starting a mission does not create a submission automatically.

It opens the normal capture/draw experience with mission context.

### SM-FR-05 — Mission eligibility

The system validates any configured constraints before submission.

Possible constraints:

- within radius
- near a defined place
- during mission period
- public/private submission allowed by mission configuration

### SM-FR-06 — Location privacy

Missions must respect the existing fresco privacy architecture. Participation in a geographic mission must not force a user to reveal exact GPS publicly.

### SM-FR-07 — Completion

A mission is completed when the artist successfully saves/submits a fresco associated with the mission.

### SM-FR-08 — No duplicate spam

The product should prevent accidental repeated submissions from the same user when a mission is configured to allow only one submission.

### SM-FR-09 — Multiple submissions

By default, users may submit one or more frescoes depending on mission configuration. The backend must support a configurable rule rather than assuming one universal policy.

### SM-FR-10 — Mission feed

Participants can browse public submissions without requiring a social follower system.

### SM-FR-11 — Explore, don't rank

Mission submissions must not expose leaderboard ranking by likes, popularity, or arbitrary scores.

Optional aggregate numbers are allowed:

- participants
- frescoes
- places
- countries/regions, when coarse and privacy-safe

### SM-FR-12 — Expired missions

Expired missions remain viewable as archive pages unless removed by an administrator.

Completed mission pages can become historical collections of interpretations.

### SM-FR-13 — Mission badges

The product may optionally award non-competitive badges such as:

- First Mission
- Neighborhood Observer
- Three Missions
- Place Explorer

Badges must represent participation, not artistic quality.

---

## 10.5 Mission creation

### MVP

Mission creation can be administrative or seeded rather than fully user-generated.

This is recommended for initial launch to reduce moderation complexity.

### Future

Trusted users or communities may create missions subject to moderation.

---

## 10.6 Suggested UI

```text
MISSIONS

TODAY
┌─────────────────────────────────────────┐
│ SOMETHING ORDINARY                      │
│ Find something people walk past.        │
│                                         │
│ 🌍 Global · Ends in 18h                 │
│ 184 artists participating               │
│                                         │
│ [ VIEW MISSION ]                        │
└─────────────────────────────────────────┘

NEAR YOU
┌─────────────────────────────────────────┐
│ DRAW YOUR CITY                          │
│ Draw something only your neighborhood   │
│ would understand.                       │
│                                         │
│ 📍 2 km · 32 artists                    │
│                                         │
│ [ START ]                               │
└─────────────────────────────────────────┘
```

---

## 10.7 Acceptance criteria

- Active missions can be discovered.
- A user can open mission details and start a drawing.
- A mission can optionally enforce geographic constraints.
- Mission context is stored with the resulting submission.
- Mission submissions appear in the mission's public gallery when public.
- Expired missions remain archived without accepting invalid late submissions unless configured otherwise.
- No competitive ranking is required to complete or participate.
- Mission participation cannot force public exact GPS disclosure.

---

# 11. Feature 4 — Collaborative Fresco

## 11.1 Overview

A Collaborative Fresco represents one shared creative artifact built from independently attributed artist contributions anchored to the same place.

The key architectural rule is:

> **One shared fresco container, many independent contribution layers.**

This is preferable to having multiple users directly overwrite a single mutable canvas.

---

## 11.2 User story

> As an artist, I want to add my own layer to a shared fresco so that multiple people can build one location-based artwork while keeping each contribution attributed.

### Secondary user stories

> As a viewer, I want to see the complete collaborative artwork and inspect individual contributions.

> As an organizer, I want to create a collaborative artwork for a class, meetup, workshop, or community activity.

---

## 11.3 Collaborative Fresco concepts

A collaborative fresco consists of:

```text
Collaborative Fresco
 ├── shared identity
 ├── place context
 ├── cover/composite image
 ├── contribution 1 → Artist A
 ├── contribution 2 → Artist B
 ├── contribution 3 → Artist C
 └── contribution N → Artist N
```

Each contribution is a distinct artwork layer.

---

## 11.4 Functional requirements

### CF-FR-01 — Create collaborative fresco

An eligible user can create a collaborative fresco from:

- an existing place
- a public fresco
- a mission
- a new capture

### CF-FR-02 — Shared location context

The collaborative container uses public-safe location context.

The container must not expose exact owner GPS unless explicitly allowed by the relevant owner and viewer policy.

### CF-FR-03 — Contribution invitation

The owner/organizer can invite additional artists to contribute.

MVP invitation mechanisms may reuse existing user identity/friend mechanisms where available.

### CF-FR-04 — Contribution creation

A contributor creates a new layer using the existing drawing flow.

### CF-FR-05 — Layer attribution

Each contribution must show:

- artist identity
- contribution timestamp
- optional contribution label
- contribution asset

### CF-FR-06 — Layer order

The collaborative fresco supports a deterministic layer order.

MVP:

- contribution created_at order
- organizer may reorder if needed

### CF-FR-07 — Non-destructive editing

A contributor cannot edit another contributor's layer.

### CF-FR-08 — Contribution removal

A contributor can remove their own contribution before or after publishing according to policy.

An organizer/admin may remove a contribution when moderation requires it.

### CF-FR-09 — Composite view

The system can display the collaborative fresco as:

1. Full composite.
2. Individual layer.
3. Contributor list.
4. Optional layer toggle view.

### CF-FR-10 — Draft/publish lifecycle

A collaborative fresco should support:

- draft
- active/open
- completed/closed
- archived

MVP may reduce this to:

- open
- closed

### CF-FR-11 — Participant permissions

The owner can control whether contributions are:

- invite-only
- public/open participation

MVP recommendation: start with invite-only to reduce abuse and synchronization complexity.

### CF-FR-12 — Public discovery

Published collaborative frescos can appear in:

- globe
- place timeline
- mission gallery
- Same Wall / place view

where their visibility settings allow.

### CF-FR-13 — Moderation

A collaborative fresco must obey existing reporting and moderation behavior.

Removing one unsafe contribution must not require deleting unrelated safe contributions.

### CF-FR-14 — Completion state

The owner can close the collaborative fresco, preventing new contributions while preserving the finished composite and layer history.

---

## 11.5 Suggested UI

### Collaborative Fresco viewer

```text
┌────────────────────────────────────────────┐
│ COMMUNITY FRESCO                           │
│                                            │
│        [ FULL COMPOSITE ARTWORK ]          │
│                                            │
│  5 artists · Old Angeles Heritage District │
│                                            │
│ [ VIEW LAYERS ] [ ADD YOUR LAYER ]         │
└────────────────────────────────────────────┘
```

### Layer panel

```text
CONTRIBUTIONS

◉ Ian Flores       Architecture
○ Maria Dizon      People
○ Jace Catriz      Street details
○ Mark Guevarra    Color
○ Fiona Guiao      Plants
```

---

## 11.6 Acceptance criteria

- A collaborative fresco can be created.
- At least two artists can contribute independently.
- Contributions remain separately attributed.
- One contributor cannot modify another contributor's layer.
- The full composite can be viewed.
- Individual layers can be inspected.
- The collaborative object has a persistent shared location context.
- Privacy and moderation policies continue to apply.
- Closing the collaborative fresco preserves the final result.

---

# 12. Cross-Feature Integration

The four features must not operate as isolated modules.

## 12.1 Draw This Wall + Place Timeline

A timeline can present multiple interpretations and provide:

**DRAW THIS PLACE**

Responses created through Draw This Wall should naturally become part of the location's timeline.

## 12.2 Sketch Missions + Draw This Wall

A mission can point participants to a specific existing fresco or place.

The resulting flow is:

```text
Mission
  ↓
Place / Fresco
  ↓
Draw This Wall
  ↓
New interpretation
  ↓
Place Timeline
```

## 12.3 Sketch Missions + Collaborative Fresco

A mission can optionally conclude with a collaborative fresco.

Example:

> “Meet at this place and each contribute one layer.”

## 12.4 Collaborative Fresco + Place Timeline

A collaborative fresco appears as one historical item while its independent contributions remain inspectable.

## 12.5 Existing Same Wall + all four features

Same Wall should become a lightweight gateway into the expanded location experience:

```text
SAME WALL
   ↓
See interpretations
   ↓
See place history
   ↓
Draw this place
   ↓
Join/create collaborative fresco
   ↓
Related missions
```

---

# 13. Information Architecture

Suggested primary navigation after implementation:

```text
HOME / GLOBE
│
├── EXPLORE PLACE
│   ├── Frescoes
│   ├── Same Wall
│   ├── Place Timeline
│   ├── Collaborative Frescos
│   └── Missions
│
├── CREATE
│   ├── Capture
│   ├── Draw This Wall
│   └── Create Collaborative Fresco
│
├── MISSIONS
│   ├── Active
│   ├── Nearby
│   └── Archive
│
├── SKETCHBOOK
│
└── PROFILE
```

This is an information architecture proposal, not a requirement to replace the current navigation wholesale.

---

# 14. Data Model

The current schema already provides the core `profiles`, `frescoes`, `fresco_locations`, `reports`, and friendship-related tables. The `frescoes` record includes owner, title, caption, memory, tags, visibility, public location, place name, capture timestamp, media paths, moderation state, and timestamps. Exact GPS is kept in `fresco_locations` and protected by RLS.

The implementation should extend this model minimally.

## 14.1 `frescoes` additions

Recommended optional columns:

```sql
source_fresco_id uuid null references public.frescoes(id) on delete set null
```

Purpose:

- identifies a Draw This Wall response
- allows response chains
- preserves source relationship separately from proximity

Optional:

```sql
mission_id uuid null
collaborative_fresco_id uuid null
```

These may also be modeled through join tables. Prefer normalized relations when one fresco could participate in multiple contextual objects.

---

## 14.2 `fresco_responses`

Recommended normalized relationship table:

```sql
create table public.fresco_responses (
  id uuid primary key default gen_random_uuid(),
  source_fresco_id uuid not null references public.frescoes(id) on delete cascade,
  response_fresco_id uuid not null unique references public.frescoes(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (source_fresco_id <> response_fresco_id)
);
```

Advantages:

- explicit response relation
- easier querying of response trees
- avoids overloading the main fresco row
- supports future response metadata

---

## 14.3 `places`

Recommended place abstraction:

```sql
create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  public_location extensions.geography(Point, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

This becomes useful when Place Timeline needs an explicit persistent identity rather than relying entirely on radius calculations.

The place record must contain **public-safe** location data only.

Exact artist GPS remains in the existing owner-only location model.

---

## 14.4 `place_frescoes`

Optional explicit relationship:

```sql
create table public.place_frescoes (
  place_id uuid not null references public.places(id) on delete cascade,
  fresco_id uuid not null references public.frescoes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (place_id, fresco_id)
);
```

This allows future place grouping and curation without changing the privacy model.

---

## 14.5 `missions`

Recommended MVP schema:

```sql
create type public.mission_type as enum (
  'global',
  'regional',
  'radius',
  'place',
  'fresco'
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  prompt text not null check (char_length(prompt) between 1 and 1000),
  description text,
  mission_type public.mission_type not null,
  status text not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  public_location extensions.geography(Point, 4326),
  radius_meters integer,
  place_id uuid references public.places(id) on delete set null,
  target_fresco_id uuid references public.frescoes(id) on delete set null,
  max_submissions_per_user integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

`status` should eventually become an enum if mission lifecycle stabilizes.

---

## 14.6 `mission_submissions`

```sql
create table public.mission_submissions (
  mission_id uuid not null references public.missions(id) on delete cascade,
  fresco_id uuid not null unique references public.frescoes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  primary key (mission_id, user_id, fresco_id)
);
```

This relationship should be the source of truth for mission participation.

---

## 14.7 `collaborative_frescos`

```sql
create table public.collaborative_frescos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  place_id uuid references public.places(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  description text,
  status text not null default 'open',
  visibility public.fresco_visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

## 14.8 `collaborative_fresco_contributions`

```sql
create table public.collaborative_fresco_contributions (
  id uuid primary key default gen_random_uuid(),
  collaborative_fresco_id uuid not null references public.collaborative_frescos(id) on delete cascade,
  fresco_id uuid not null unique references public.frescoes(id) on delete cascade,
  contributor_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  layer_order integer not null default 0,
  created_at timestamptz not null default now()
);
```

Each contribution should correspond to an otherwise normal fresco so existing rendering, ownership, storage, and moderation infrastructure can be reused.

---

# 15. Geospatial Requirements

The current product already uses PostGIS and a public-safe `public_location` geometry, with exact GPS isolated into owner-only storage.

New geospatial behavior must follow these rules:

### G-01
All public discovery uses `public_location` or another public-safe place coordinate.

### G-02
Exact GPS must never be reconstructed from a neighborhood-level public point.

### G-03
Geospatial queries must be server-side or through approved database functions where practical.

### G-04
Use spatial indexes for public location discovery.

### G-05
All radius values are configuration, not hard-coded UI assumptions.

### G-06
A response relationship is not equivalent to geospatial proximity.

### G-07
Place grouping must be stable enough for repeat visits but flexible enough to avoid incorrectly merging separate locations.

---

# 16. API / Backend Requirements

The implementation may expose Supabase queries, Postgres RPC functions, or application API routes depending on the existing code organization. The public behavior should remain independent of the transport mechanism.

## 16.1 Draw This Wall

Required backend operations:

```text
create_response_fresco(source_fresco_id, payload)
get_fresco_responses(fresco_id)
get_response_source(fresco_id)
```

Expected behavior:

- validate source visibility
- validate moderation state
- validate user authentication for creation
- create new fresco with new owner
- persist relationship
- preserve privacy controls

## 16.2 Place Timeline

Required operations:

```text
get_place(place_id)
get_place_frescos(place_id, cursor)
get_place_timeline(place_id, year, cursor)
compare_place_frescos(fresco_a, fresco_b)
```

A server-side geospatial function may be preferred for distance filtering and predictable performance.

## 16.3 Missions

Required operations:

```text
list_active_missions(scope)
get_mission(mission_id)
start_mission(mission_id)
submit_mission_fresco(mission_id, fresco_id)
list_mission_submissions(mission_id, cursor)
```

## 16.4 Collaborative Fresco

Required operations:

```text
create_collaborative_fresco(payload)
invite_collaborator(collaborative_fresco_id, user_id)
add_contribution(collaborative_fresco_id, fresco_id)
list_contributions(collaborative_fresco_id)
reorder_contribution(contribution_id, order)
close_collaborative_fresco(id)
```

---

# 17. Security and RLS Requirements

Security is a release blocker for these features.

## SEC-01 — Ownership

A user can create and modify only resources they own or are explicitly permitted to modify.

## SEC-02 — Exact location isolation

The new feature queries must never read owner-only exact coordinates on behalf of another user.

## SEC-03 — Public filtering

Public queries must include visibility and moderation conditions.

## SEC-04 — Response permissions

Any user may create a response only when the source fresco is publicly accessible.

## SEC-05 — Collaboration permissions

Only the collaborative owner/admin and the contribution owner should be able to perform their respective protected operations.

## SEC-06 — Mission submission integrity

Do not trust mission eligibility values supplied by the browser.

Validate location/time/status constraints on the server or database layer.

## SEC-07 — Rate limiting

Mission submission and collaborative invitation endpoints should be protected against simple spam/abuse.

## SEC-08 — Deletion

Deletion of a source fresco must not unintentionally expose a previously private relationship or exact GPS.

## SEC-09 — Moderation

If a fresco is hidden by moderation, it must disappear from public place, mission, and response discovery while retaining ownership semantics for its creator.

---

# 18. UX Requirements

## UX-01 — Do not force navigation changes unnecessarily

New features should appear as contextual actions wherever they naturally belong.

## UX-02 — Preserve the drawing canvas

Starting Draw This Wall or a mission should reuse the existing drawing experience rather than opening a separate editor.

## UX-03 — Keep place context visible

While drawing, users should know:

- what place they are drawing
- whether they are answering a mission
- whether they are responding to another fresco

## UX-04 — Avoid modal overload

Context should be shown in compact panels/cards rather than a sequence of confirmation dialogs.

## UX-05 — Empty states should invite creation

Example:

> **No other interpretations here yet.**  
> Be the next artist to draw this place.

## UX-06 — Respect artist authorship

Use clear language such as:

- “Inspired by…”
- “Response to…”
- “Contribution by…”
- “Part of Community Fresco…”

Avoid language implying that one artist's version is objectively better.

---

# 19. Responsive Design Requirements

The application must remain functional at:

- phone portrait
- phone landscape
- tablet portrait
- tablet landscape
- laptop
- desktop

### Mobile priorities

- drawing canvas remains primary
- CTAs reachable with one hand where practical
- timeline can horizontally scroll
- mission cards stack vertically
- contribution layers use bottom sheets or compact panels
- map/globe controls remain touch-friendly

### Desktop priorities

- larger viewer/editor layouts
- side-by-side timeline comparison
- multi-panel collaborative layer inspection

---

# 20. Accessibility Requirements

- All buttons require accessible names.
- Keyboard users must be able to navigate all non-canvas controls.
- Focus states must remain visible.
- Color must not be the only indicator of state.
- Timeline controls must expose text alternatives for screen readers.
- Mission cards must remain readable with browser zoom.
- Layer visibility controls must provide accessible state information.
- Drawing functionality should degrade gracefully for users who cannot use pointer/touch input where possible.

---

# 21. Performance Requirements

### PERF-01
Place and mission listings must be paginated or cursor-based.

### PERF-02
Timeline queries must avoid returning original image payloads when thumbnails are sufficient.

### PERF-03
Collaborative fresco composite generation should not block the drawing UI.

### PERF-04
Layer previews should use thumbnails where possible.

### PERF-05
Geospatial indexes must be used for repeated public location queries.

### PERF-06
Existing compressed-image/storage strategy should remain intact unless a measured need requires change.

### PERF-07
No feature should make the initial application bundle substantially larger without a demonstrated benefit.

---

# 22. Moderation and Trust

The new features increase user-generated content relationships, so moderation must extend to those relationships.

### Required behavior

- Reports continue to work on individual frescoes.
- A report on one contribution should not automatically remove unrelated contributions.
- Hidden source frescoes disappear from public response discovery.
- Mission pages must support removal of unsafe submissions.
- Collaborative frescos must allow unsafe contribution isolation.

### Future moderation improvements

Not required for MVP:

- community moderators
- mission-specific moderators
- automated duplicate detection
- abuse scoring
- advanced trust levels

---

# 23. Analytics

Analytics should focus on product learning rather than maximizing engagement.

## Draw This Wall events

```text
draw_this_wall_viewed
draw_this_wall_started
draw_this_wall_abandoned
draw_this_wall_published
response_relationship_created
```

## Timeline events

```text
place_viewed
place_timeline_opened
timeline_year_changed
place_comparison_started
place_comparison_completed
draw_from_place_started
```

## Mission events

```text
mission_list_viewed
mission_opened
mission_started
mission_submission_started
mission_submission_completed
mission_abandoned
```

## Collaboration events

```text
collaborative_fresco_created
collaboration_invite_sent
collaboration_joined
contribution_started
contribution_published
collaborative_fresco_viewed
collaborative_fresco_closed
```

No analytics event should store precise user location beyond what is required for existing product functionality.

---

# 24. Testing Strategy

## Unit tests

Test:

- response relationship creation
- source eligibility
- privacy inheritance/defaults
- mission lifecycle
- mission time constraints
- mission radius validation
- contribution ownership
- layer ordering
- place grouping logic
- timeline ordering

## Database/schema tests

Using the existing PGlite/schema test approach where practical:

- RLS prevents cross-user exact location access.
- Public queries only return public/approved frescoes.
- Response relationships cannot self-reference.
- Mission submissions reference valid users/frescos.
- Contribution ownership remains intact.
- Deleting a source does not leak private data.

## Integration tests

### Draw This Wall

1. Sign in.
2. Open public fresco.
3. Start Draw This Wall.
4. Create and save response.
5. Verify response appears in Same Wall/place view.
6. Verify source remains unchanged.

### Place Timeline

1. Seed public frescoes at one place with different timestamps.
2. Open place.
3. Verify chronological grouping.
4. Switch year.
5. Compare two frescoes.
6. Verify private/hidden frescoes are absent.

### Sketch Missions

1. Create active mission.
2. Open mission.
3. Start drawing.
4. Submit valid fresco.
5. Verify mission submission.
6. Attempt invalid geographic/time submission.
7. Verify backend rejects invalid submission.

### Collaborative Fresco

1. User A creates collaborative fresco.
2. User B joins.
3. User B adds contribution.
4. User A views composite.
5. User B attempts to modify User A contribution.
6. Verify authorization failure.
7. Close collaborative fresco.
8. Verify new contribution is blocked.

## End-to-end browser tests

Use Playwright for:

- CTA visibility
- navigation
- mobile responsive behavior
- timeline interaction
- mission submission flow
- collaboration layer controls

---

# 25. Seed Data / Demo Mode

For demonstrations and hackathon judging, the product should include realistic seeded examples.

Suggested demo data:

### Place A

**Old City Hall**

- 3 artists
- 5 frescoes
- 2 years
- 1 Draw This Wall response chain

### Place B

**Heritage Street**

- 4 artists
- 6 frescoes
- 3 years
- 1 collaborative fresco

### Missions

- Something Ordinary
- Draw Your Neighborhood
- Same Place, Different Eyes

The demo should make the four features visible even when the live community is small.

---

# 26. Implementation Phases

## Phase 0 — Foundation and schema

**Goal:** prepare data relationships without changing existing behavior.

Tasks:

- Add response relation schema.
- Add mission schema.
- Add collaborative fresco schema.
- Decide whether explicit `places` are required for MVP or can initially be derived.
- Add indexes.
- Add RLS policies.
- Add database functions for geospatial queries where required.
- Add migration tests.

**Definition of done:** migrations apply cleanly and existing Sinopia functionality remains green.

---

## Phase 1 — Draw This Wall

**Goal:** make Same Wall actionable.

Tasks:

- Fresco viewer CTA.
- Response creation flow.
- Source relationship persistence.
- Attribution UI.
- Same Wall grouping improvements.
- Privacy validation.
- Response tree/query.
- Tests.

**Definition of done:** a user can discover a public fresco, respond to it, publish the new fresco, and see the relationship and shared location.

---

## Phase 2 — Place Timeline

**Goal:** transform shared locations into visual histories.

Tasks:

- Place grouping/query.
- Timeline screen.
- Chronological browsing.
- Year filter.
- Place summary.
- Two-fresco comparison.
- Draw This Place CTA.
- Pagination/performance work.
- Tests.

**Definition of done:** a user can open a shared place and navigate public interpretations across time.

---

## Phase 3 — Sketch Missions

**Goal:** add a structured reason to create.

Tasks:

- Mission schema/UI.
- Admin/seeded mission creation.
- Mission detail page.
- Mission-to-drawing context.
- Submission validation.
- Mission gallery.
- Archive states.
- Optional participation badge.
- Tests.

**Definition of done:** a user can discover an active mission, create a fresco through it, and see the submission in the mission archive/gallery.

---

## Phase 4 — Collaborative Fresco

**Goal:** enable structured multi-artist artwork.

Tasks:

- Collaborative fresco container.
- Invitations/permissions.
- Contribution creation.
- Layer display.
- Composite generation/view.
- Contribution attribution.
- Close/archive lifecycle.
- Moderation isolation.
- Tests.

**Definition of done:** at least two authenticated users can contribute independently to the same collaborative fresco without overwriting one another.

---

# 27. Recommended Git Branch / Delivery Structure

Use one branch per major phase rather than one branch per tiny feature.

Suggested names:

```text
feat/sinopia-place-interactions
feat/sinopia-place-timeline
feat/sinopia-sketch-missions
feat/sinopia-collaborative-fresco
```

Optional foundation branch:

```text
feat/sinopia-feature-foundation
```

Recommended implementation order:

```text
Foundation
   ↓
Draw This Wall
   ↓
Place Timeline
   ↓
Sketch Missions
   ↓
Collaborative Fresco
```

The branch should be mergeable at the end of each phase.

---

# 28. MVP Scope vs. Later Scope

## MVP — required

### Draw This Wall

- start response from public fresco
- source relationship
- independent artwork
- attribution
- Same Wall integration
- privacy-safe location handling

### Place Timeline

- public location grouping
- chronological view
- year navigation
- basic comparison
- Draw This Place action

### Sketch Missions

- system/admin-created missions
- global/radius/place missions
- mission detail
- start mission
- submission linkage
- mission gallery

### Collaborative Fresco

- owner-created collaborative object
- invite-only contributors
- independent contributions
- attribution
- layer viewing
- close/lock state

## Post-MVP

- community-created missions
- public collaborative frescos without invitations
- advanced place curation
- map stories
- sketch walks
- AI creative assistant
- advanced portfolio export
- social sharing integrations
- historical/place metadata enrichment

---

# 29. Out of Scope

The following should not be introduced as part of this feature expansion unless separately approved:

- full messaging platform
- creator monetization
- marketplace
- follower-centric home feed
- likes/follower ranking system
- generative AI art creation
- NFT/blockchain features
- automated art-quality scoring
- public exact-GPS defaults
- replacing the existing drawing engine
- rebuilding the globe/map architecture unnecessarily

---

# 30. Risks and Mitigations

## Risk 1 — Location ambiguity

Multiple nearby artworks may not actually depict the exact same wall.

**Mitigation:** keep “Same Wall,” “Place,” and explicit response relationships as separate concepts.

## Risk 2 — Privacy leakage

New place queries could accidentally use exact owner GPS.

**Mitigation:** all public queries use public-safe location; exact GPS remains owner-only.

## Risk 3 — Collaborative abuse

Open participation could invite vandalism or spam.

**Mitigation:** start with invite-only collaboration and existing moderation/reporting.

## Risk 4 — Mission spam

Users could submit unrelated or duplicate work.

**Mitigation:** mission-specific submission relations, configurable constraints, backend validation, moderation.

## Risk 5 — Heavy queries

Large locations can accumulate thousands of frescoes.

**Mitigation:** spatial indexes, pagination, thumbnails, bounded timeline windows.

## Risk 6 — Feature overload

Adding many screens can make Sinopia harder to understand.

**Mitigation:** keep contextual actions close to places and frescoes rather than adding many top-level destinations.

## Risk 7 — Social-network drift

The product could become centered around artist popularity.

**Mitigation:** organize discovery around place, time, interpretation, missions, and collaboration—not follower metrics.

---

# 31. Product Quality Bar

A feature is not considered complete merely because the happy path works.

Each phase must satisfy:

### Functional

- happy path works
- invalid state is handled
- empty state is designed
- loading/error states exist
- mobile and desktop work

### Data

- schema migration is reproducible
- indexes exist where needed
- relationships are explicit
- deletion behavior is defined

### Security

- RLS policies are tested
- exact GPS is protected
- ownership is validated server-side

### UX

- user understands why the action exists
- user understands location context
- user understands authorship
- user can recover from errors

### Performance

- list/timeline queries are bounded
- images are appropriately sized
- no unnecessary full-resolution downloads

### Testing

- unit/database tests
- integration tests
- Playwright coverage for primary flow

---

# 32. Detailed Acceptance Checklist

## Draw This Wall

- [ ] CTA appears only where appropriate.
- [ ] Public source eligibility is enforced.
- [ ] New fresco is distinct from source.
- [ ] Source relationship is persisted.
- [ ] Attribution is visible.
- [ ] Same Wall integration works.
- [ ] Original artist cannot have their artwork modified by the responder.
- [ ] Source privacy changes are handled gracefully.
- [ ] No exact GPS leak occurs.

## Place Timeline

- [ ] Place page opens from an existing location.
- [ ] Public artworks appear chronologically.
- [ ] Year navigation works.
- [ ] Earliest/latest dates are correct.
- [ ] Comparison works.
- [ ] Hidden/private artworks are excluded.
- [ ] Draw This Place works.
- [ ] Large result sets are paginated.

## Sketch Missions

- [ ] Active missions are visible.
- [ ] Mission details are understandable.
- [ ] Start Mission opens the drawing flow.
- [ ] Submission is linked to mission.
- [ ] Location/time rules are validated.
- [ ] Public mission gallery respects fresco visibility.
- [ ] Expired missions are archived.
- [ ] No competitive ranking is required.

## Collaborative Fresco

- [ ] Collaborative object can be created.
- [ ] Collaborators can be invited.
- [ ] Contributions are independent.
- [ ] Contributors are credited.
- [ ] Layers can be inspected.
- [ ] Unauthorized layer editing is prevented.
- [ ] Composite view works.
- [ ] Collaborative fresco can be closed.
- [ ] Moderation can isolate an unsafe contribution.

---

# 33. Example End-to-End Product Story

A user opens Sinopia and explores the globe.

They tap a fresco at a heritage building.

The viewer shows the real photo and artistic interpretation.

They notice:

> **8 artists have drawn this place.**

They open **Place Timeline** and see artworks from 2023, 2025, and 2026.

They select a 2025 sketch and compare it with a 2026 sketch.

They then tap:

> **DRAW THIS PLACE**

Their capture/drawing flow opens with the place context.

After finishing, their fresco becomes another interpretation in the timeline.

Later, they discover a Sketch Mission:

> **“Same Place, Different Eyes.”**

The mission directs artists to the same heritage building.

Three artists participate.

One artist starts a **Collaborative Fresco**.

Each artist contributes a different layer.

The resulting location now contains:

```text
PLACE
│
├── 2025 frescoes
├── 2026 frescoes
├── Draw This Wall response chain
├── Sketch Mission submissions
└── Collaborative Fresco
      ├── Artist A
      ├── Artist B
      └── Artist C
```

The place is no longer just a map coordinate.

It has become a **living collection of human perspectives**.

---

# 34. Final Product Direction

The most important product decision in this PRD is that the four features should reinforce one concept rather than become separate feature checkboxes.

Sinopia should increasingly answer three questions:

### SAME PLACE

**Where was this seen?**

### DIFFERENT EYES

**How did different people interpret it?**

### OVER TIME

**How has that place been experienced and recorded across time?**

The four priority features map directly to those ideas:

| Feature | Product role |
|---|---|
| **Draw This Wall** | Different artists interpret the same place. |
| **Place Timeline** | Those interpretations become a visual history. |
| **Sketch Missions** | People are motivated to observe and create in real places. |
| **Collaborative Fresco** | Multiple artists can create one shared place-based work. |

The desired long-term identity is:

> **Sinopia is a living visual archive of places, created through the eyes of the people who were there.**

That identity is stronger when the product treats location, time, authorship, and observation as first-class concepts rather than adding conventional social-media features.

---

# 35. Reference Notes

The current GitHub README documents the existing location-based Sinopia concept and current feature baseline, including capture, drawing, public/private frescoes, artist globes, Same Wall, weather, street-level imagery, and privacy handling.

The current database schema documents Supabase/Postgres/PostGIS storage, the `frescoes` table, the owner-only `fresco_locations` table, public-safe `public_location`, public-location spatial indexing, and Row Level Security policies.

This PRD intentionally extends those documented foundations rather than requiring a separate application architecture.
