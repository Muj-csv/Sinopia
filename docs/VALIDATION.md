# Sinopia: Validation (GUNDAM PRISM, pivot check)

| | |
|---|---|
| Date | 2026-09-27 (PHT) |
| Mode | QUICK+ (hackathon pivot): existing solutions, feasibility, scope, gates |
| Decision under test | D-001: Sinopia becomes a place-based drawing app |

## Existing solutions (searched 2026-09-27)

| Name | What it does | Where Sinopia differs |
|---|---|---|
| Wplace (and similar collaborative pixel maps) | Everyone paints pixels directly onto a world map | Sinopia draws on a *photo of the real place*, keeps the photo and drawing separate, and shows the real spot beside the art |
| Sketch On Map, Draw on Map, map-note apps | Draw lines and labels on a map | Annotating maps, not reinterpreting places as artwork |
| GPS art tools (GPSArtify, RouteSketcher) | Draw shapes by walking or running routes | Art made *with* movement, not *of* a place |
| Instagram / photo apps with location tags | Location is metadata on a post in a feed | Sinopia's unit is photo + drawing + place + time, organised by the Earth, with no likes or feeds |
| Reference sites (Pinterest, Unsplash, Openverse) | Find images | Sinopia puts licensed references inside the drawing step |

I did not find, in the sources I searched, an app that combines drawing over your own photo of a place, in-canvas references with licenses, and a public globe of those drawings next to the real place. That's not proof none exists.

## Feasibility

- **Prototype:** feasible in ~4.5 days with 4 people if the scope in `PRD.md` §6 holds. Every dependency is free and needs no card. The riskiest pieces are drawing performance on phones and the publish flow's privacy rules; the rules are already tested (`schema.test.mjs`), and drawing gets a spike on day one.
- **Production:** Supabase Free limits (1 GB storage, 5 GB egress, 7-day pause) cap it at a few hundred public frescoes; beyond that it needs paid storage or R2. Moderation would need real review tooling.

## Scope boundary

```text
CORE MECHANISM    photo of a real place + drawing layer + exact place/time → private Sketchbook or public globe
MUST HAVE         capture + pin · draw with layers/undo · reference panel · save · publish/unpublish with precision
                  · globe with clusters · viewer with Reality↔Drawing slider · Same Wall · report · seeded frescoes
SUPPORTING        street-level view · angle chips · safety check · weather
                  · doodle-to-word suggestions (reopened 2026-10-02, D-019: on-device model, no server)
DEFERRED          responses · timelines · collections · AR
DO NOT BUILD YET  likes/followers/feeds · comments · generative AI · native apps · anything paid
FIRST PROOF       Phase 0: deployed globe + sign-in + a real-phone drawing spike + RLS checks on the real project
```

## Gates

| Gate | Result | Reason |
|---|---|---|
| Problem | NEEDS EVIDENCE | Real for the team as artists; no outside artist evidence yet; get 5 reactions before the video |
| User | PASS | Art students and hobby artists who draw over photos or on location |
| Differentiation | PASS | Map-painting and map-note apps don't reinterpret photos of places; photo apps don't keep the drawing layer or references |
| Feasibility | PASS (prototype) | Free open stack, tested schema, tight MVP; risk is time, managed by the cut order |
| Evidence | NEEDS EVIDENCE | See Problem; also confirm D-004 (distinct from the FirstCommit entry) |

**Verdict: GO**, on the condition that D-004 is settled today and the cut order in `IMPLEMENTATION_PLAN.md` is followed.

## Sources
- Wplace: https://www.wigglypaint.art/tools/wplace · Sketch On Map: https://play.google.com/store/apps/details?id=com.gonext.sketchonmap · GPSArtify: https://gpsartify.com/ · RouteSketcher: https://routesketcher.com/
- GIBC V2 rules: https://gibc-v2.devpost.com/rules
