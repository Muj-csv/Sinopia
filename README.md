<div align="center">

# Sinopia

**Your underdrawing, checked against real bodies.**

*Sinopia* (the reddish underdrawing painters sketched beneath a fresco)
**S**ketch **I**nterpreted **N**ext to **O**bserved **P**hotographic **I**nstances of **A**natomy

![Status](https://img.shields.io/badge/status-in%20development-orange)
![Platform](https://img.shields.io/badge/platform-web-5A67D8)
![Hackathon](https://img.shields.io/badge/GIBC%20V2-Track%2003%20Open-blue)

</div>

> **Draft README.** Sinopia is being built for the Global Innovation Build Challenge V2 (Sept–Oct 2026). Features marked *planned* aren't finished yet, and this document will change as the project does.

---

## Overview

People learning gesture drawing make quick, rough figure sketches. When a sketch looks wrong, they usually can't say *why*: is the pelvis tilted the wrong way, is the weight leg not under the body, does the arm bend in a way a body can't? Poses can't be described in words, and comparing a drawing with a photo by eye is the very skill they're still learning.

Sinopia turns a gesture sketch into evidence. It reads the body structure of your sketch as a **pose signature** (torso lean, shoulder and pelvis tilt, limb angles, balance, line of action). It then finds openly licensed photographs of real people whose body mechanics match, and shows **region by region where your drawing agrees with real bodies and where it differs**.

> Pose-search tools help you *find* a pose. Sinopia shows you how the pose *you drew* compares with reality.

## Features

| Feature | Status |
|---|---|
| Sketch input: upload, camera photo, or draw in the browser | Planned |
| Skeleton detection with drag-to-fix joints (manual placement always available) | Planned |
| Pose signature: tilts, bends, balance, line of action | Planned |
| Structural matching against real photographs (mirror-aware) | Planned |
| Gesture families: same gesture / same upper body / same lower body | Planned |
| Evidence view: sketch vs photo, overlay, region-by-region similarity, largest differences | Planned |
| Lock a relationship (e.g. torso + right arm) and search around it | Planned |
| License and attribution on every reference | Planned |
| Counter-check: "uncommon in this reference set" | Planned, supporting |
| Step-by-step construction guide | Later |

## How it works

```mermaid
flowchart LR
  S[Your sketch] --> K[Skeleton\n(auto or by hand)]
  K --> P[Pose signature]
  P --> M[Structural match\nagainst real photos]
  M --> F[Gesture families]
  M --> E[Evidence view:\nwhere your drawing\nagrees and differs]
  E --> L[Reference with\nlicense + attribution]
```

1. **Sketch.** Upload or draw a rough gesture. A 20-second sketch is enough.
2. **Read.** Sinopia finds the skeleton; drag any joint that's off, or place them yourself.
3. **Signature.** The pose becomes named measurements: "torso lean +17°, pelvis tilt −8°, weight on the right leg".
4. **Evidence.** Real photographs with matching mechanics, grouped into gesture families.
5. **Compare.** Put your sketch beside any reference to see per-region similarity and the biggest differences, e.g. "Pelvis tilt: yours −8°, reference +3°".

Sinopia describes **pose geometry similarity**. It doesn't grade your drawing or call it "correct"; stylized poses are allowed.

## Privacy and licensing

- **Your sketch never leaves your device.** All processing runs in the browser.
- **References come from openly licensed sources.** Every displayed result carries the license information reported by its source, plus attribution metadata. Entries with missing licensing metadata are excluded. License information is as reported upstream, so check it at the source before reuse.
- **No images are stored or re-hosted.** Sinopia stores pose measurements and links only.

## Tech stack

| Layer | Technology |
|---|---|
| Web app | TypeScript, Vite, React |
| Pose detection | MediaPipe Pose Landmarker (in the browser, WASM) |
| Reference index | Python ingest pipeline over the Openverse API |
| Hosting | Static hosting (no backend) |
| Tests | Vitest, pytest, shared test vectors |

## Getting started

> Setup steps will be confirmed once the first build lands.

**Requirements**
- Node.js 20+
- Python 3.11+ (only to rebuild the reference index)

**Run the app**
```bash
git clone https://github.com/<org>/sinopia.git
cd sinopia/web
npm install
npm run dev
```

**Rebuild the reference index (optional)**
```bash
cd ingest
pip install -r requirements.txt
pytest
python ingest.py --limit 3000
```

## Project structure

```
web/       The Sinopia web app (capture, pose signature, matching, evidence view)
ingest/    Builds the reference index from openly licensed photos
shared/    Rule constants, index schema and test vectors used by both
spike/     Early detection experiments on real sketches
docs/      PRD, architecture, implementation plan, decisions, build phases
```

## Documentation

- [Product requirements](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Decision log](docs/DECISIONS.md)

## Known limitations

- **2D analysis.** Foreshortening affects apparent limb lengths, so ratios are labelled "apparent" and weighted lightly.
- **Detection on drawings is imperfect.** The pose model is trained on photos, so manual joint placement is always available.
- **The reference set is small** (a few thousand images), so "uncommon" means uncommon *in this set*.
- Licensing depends on metadata reported by the source.

## Related work

- Pose-search tools: Aphrite Pose Search, PoseSearch (Bodies in Motion), x6ud/pose-search, Pose Arch
- Sketch → 3D pose: Posematic; Sketch2Pose (ACM TOG 2022)
- Gesture-practice libraries: Line of Action, Quickposes

These tools help you find or build a pose. Sinopia compares the structure of your own drawing against real bodies.

## Roadmap

- [ ] MVP for GIBC V2 (see [implementation plan](docs/IMPLEMENTATION_PLAN.md))
- [ ] Step-by-step construction guide (line of action → stick figure → masses → form)
- [ ] Larger reference set
- [ ] Camera-angle-aware (3D) matching

## Team

| Name | Role |
|---|---|
| Jum Flores | Team lead |
| _TBD_ | _TBD_ |

## License

_To be decided before submission._

## Acknowledgments

Built for the **Global Innovation Build Challenge V2**. Reference images courtesy of their creators via openly licensed sources; see the attribution on each result.
