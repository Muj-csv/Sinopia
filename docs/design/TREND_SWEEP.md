# Veronica trend sweep: Sinopia

Run: 2026-09-27 (on-demand full sweep, `trend-refresh.md`). Scope: the general AI-slop sweep, plus the feature-specific patterns that can make Sinopia's canvas, reference panel, globe, viewer slider, Same Wall and Sketchbook look generic.

**How to use this file:** it feeds the **Forbidden list** in `DESIGN_BRIEF.md` (Phase C). Anything below is fine *if it's a real, stated decision*. It's a tell only when it shows up because nobody decided otherwise.

---

## Part 1: General refresh (new instances in existing `tells.md` categories)

| Cat. | New or confirmed instance (Sep 2026) | Source |
|---|---|---|
| 1 Color | Gradients are still the most-requested visual device (61k prompts / 21.5k projects, Jan–Jun 2026). Blue is the #1 named color. | Superdesign |
| 1 Color | "VibeCode purple," a specific lavender that leaks in from image generators. | Developers Digest |
| 1 Color | Permanent dark mode with medium-grey body text and barely-passing contrast. Dark-mode prompts rose from 26.8% to 38.1% between Jan and May. | Developers Digest, Superdesign |
| 1+2 | **The "Claude Design look":** dark background, warm amber or muted violet accent, Fraunces + Inter, one soft italic serif word per headline. Called "to 2026 what Bootstrap was to 2014." | The AI Cliff (Apr 2026) |
| 2 Type | Space Grotesk added to the overused set (with Inter, Geist, Instrument Serif). All-caps section labels. Italic display headers. | Developers Digest, Hallmark |
| 3 Layout | A badge or pill above the H1. "Preview" / "Coming soon" pills. **Monospace labels in card corners.** Emoji icons in the nav or sidebar. | Developers Digest, The AI Cliff |
| 3 Layout | Fake device chrome: phone bezels, browser frames, mock IDE windows around screenshots. | Hallmark (Jul 2026) |
| 3 Layout | Bento grids: Creative Boom lists them among the trends creatives are "so over" (Apr 2026), while StudioMeyer says they held up as a standard. **Contested, but tipping toward default.** | Creative Boom, StudioMeyer |
| 4 Motion | Bounce on hover. Glassmorphism / liquid glass everywhere, often with neon borders. | Medium (Aug 2026), Creative Boom |
| 5 Copy | "Revolutionize your workflow," plus the existing Transform / Supercharge / Unleash set. | Hallmark |
| 6 Quality | Horizontal scroll at 320–414 px. Two-line button labels on small screens. | Hallmark |
| 7 Fabrication | Made-up metrics and stat-led layouts with no real numbers behind them. | Hallmark |
| — | Linear is still the most-named reference in prompts (229), ahead of Apple (173) and Stripe (141). This confirms the existing `tells.md` warning. | Superdesign |

### A possible new mechanism (flagged, not added silently)

**Effects chosen without checking their cost on the target device.** `backdrop-filter` glass costs 15–30% FPS on mid-tier Android. A single WebGL scene ships 800 kB–2 MB of JS before it renders (StudioMeyer). This isn't "motion without purpose" (Category 4). The problem is a visual effect added with no check against the device budget. It matters directly for Sinopia because NFR-002 targets a mid-range Android on 4G. It's proposed as **Category 8** for `tells.md`, pending your OK.

---

## Part 2: Sinopia, feature by feature

### The concept trap (read this first)
The name pulls hard toward **plaster cream + red-ochre/terracotta + a Renaissance-style serif (often italic)**. That combination sits one step away from two documented tasteful defaults: cream + earthy accent + serif display, and the Fraunces-italic "Claude Design look."
- Legit version: sinopia really is a red-earth pigment, so a red earth *can* be traced to something real. Sample it from an actual sinopia photograph, for example the detached underdrawings at Pisa's Museo delle Sinopie, and don't default to a warm cream page or an italic serif to go with it.
- Decision needed in Phase C: is the fresco metaphor **load-bearing in the visuals**, or only in the vocabulary (Sinopia / Fresco / Sketchbook / Same Wall)?

### Studio: drawing canvas (FR-004), the anchor-screen candidate
- **Tell to avoid:** a floating frosted-glass pill toolbar over the canvas. It's the stock 2026 look, and `backdrop-filter` over a live canvas works against the ≤16 ms stroke target. **Rule proposal:** no `backdrop-filter` anywhere over the canvas. Use solid surfaces.
- Thumb zone: primary controls in the bottom third. Stacked FABs are discouraged (Muzli, Apr 2026).
- Genre convention to respect, not reinvent: the tool chrome stays out of the way and the artwork is the UI (Procreate model). Procreate-style gesture undo (two-finger tap) is a learned convention for this audience.
- An untouched icon set with default stroke weights on every tool is the Category 3 "library default." Pick the icon set on purpose.
- Chrome color has a genre reason here: saturated or tinted chrome next to the photo shifts how artists see color. Neutral chrome is a defensible *decision*, not a default. Say so if we choose it.

### Reference panel (FR-005)
- **Tell to avoid:** a generic image-search grid in a modal that covers the canvas. It defeats G-2 ("without leaving the canvas").
- What artists already use (PureRef): the reference **stays on top** of the work, can be click-through, and can be cropped or zoomed. On phones that means a bottom sheet with detents (peek, half) that never fully hides the canvas.
- Option for Phase B/C: tap a result to **pin** it as a small movable thumbnail at the canvas edge.
- License, creator and source (NFR-004) should be a readable caption at AA contrast, not 10 px grey text. That would repeat the "barely-passing contrast" tell.

### Globe (FR-009)
- **The big one:** the decorative *dotted globe with glowing arcs* (Stripe 2020 → cobe → Magic UI, Aceternity "GitHub Globe", 21st.dev "Globe Hero") is one of the most-copied component-library heroes. Sinopia's globe does a real job, so it's allowed, but it has to look like a **real map whose pins are frescoes**, not dots, arcs, an atmospheric glow halo or an idle auto-spin.
- Budget: WebGL underdelivered on mid-range devices. Lazy-load the globe, pause it off-screen, draw a single frame under reduced motion, and show a fallback when WebGL isn't available (the pattern from langx PR #145). This protects NFR-002's "globe interactive ≤ 4 s."
- A stock cluster bubble (colored circle + count) and stock teardrop pins are untouched library defaults. Decide what a cluster of *drawings* looks like.

### Fresco viewer: Reality ↔ Drawing slider (FR-010)
- **Tell to avoid:** the WordPress-plugin look, meaning a vertical divider, a round handle with ◀ ▶ chevrons, and "Before"/"After" pills in the corners.
- Accessibility floor (NFR-006): a focusable handle driven by arrow keys (CodyHouse pattern). Build it on a native `input[type=range]` with a real label.
- Decision for Phase C/D: a **wipe** (the divider reveals the drawing) or a **fade** (the drawing's opacity rises over the photo). Both meet FR-010. The fade matches the fresco metaphor more literally (paint going over the underdrawing). The wipe is more familiar.

### Same Wall strip (FR-011) and Sketchbook (FR-012)
- Bento or masonry as the default gallery is tipping into a tell (see Part 1). The PRD already gives the real structure, "grouped by place or month," so build from that.
- **Watch this:** coordinates and dates on cards make monospace corner labels very tempting. That is exactly the "Claude Design look" card. Coordinates are real data, so monospace *can* be justified, but only as a stated choice.
- Avoid identical rounded cards with a hairline border plus a diffuse shadow (existing tell). Pick one kind of edge.
- The Same Wall empty state ("nobody else has drawn here yet") should be a designed moment (`consumer-mobile.md`).

### Finish and Publish (FR-006, FR-008)
- The exact-location warning must not become a callout with a colored left stripe. That's still the most-recognized AI UI tell.
- UX option for Phase B: show the **neighborhood vs. exact** choice as a map preview of what the public will actually see (the snapped ~550 m cell vs. the point), not as a bare toggle.

### Copy, seeded content and demo assets
- No ✨ or sparkle icons anywhere. Sinopia uses **no generative AI** (PRD §11), so the sparkle would mislead people.
- Keep the PRD tagline as written. Don't italicize a single word in a serif ("Draw on the *real* world"), because that's the cliché.
- FR-014 seeded frescoes: real team drawings under real team names, with no Jane Doe artists and no lorem captions (Category 7).
- Devpost screenshots: real device captures, no fake phone bezels (Hallmark flag).

---

## Sources
- [Superdesign: AI UI Design Statistics 2026 (210k prompts)](https://superdesign.dev/blog/ai-ui-design-statistics)
- [Developers Digest: AI Design Slop, 16 Patterns](https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it)
- [The AI Cliff: AI Design Already Has a Cliché](https://theaicliff.substack.com/p/ai-design-already-has-a-cliche-youre)
- [Mohit Phogat: AI Design Slop (Aug 2026)](https://mohitphogat.medium.com/ai-design-slop-why-every-ai-built-interface-looks-the-same-and-how-to-fix-it-bf874e0b470c)
- [explainx: Hallmark anti-slop design skill (Jul 2026)](https://explainx.ai/blog/nutlope-hallmark-anti-ai-slop-design-skill-july-2026)
- [Creative Boom: 10 trends creatives are so over in 2026](https://www.creativeboom.com/insight/10-trends-creatives-are-so-over-in-2026/)
- [StudioMeyer: Web Design Trends 2026 reality check](https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check)
- [Muzli: Mobile UI patterns that matter in 2026](https://muz.li/blog/whats-changing-in-mobile-app-design-ui-patterns-that-matter-in-2026/)
- [mean.ceo: Design Trends, September 2026](https://blog.mean.ceo/design-trends-september-2026/)
- [langx PR #145: globe in hero (perf/a11y handling)](https://github.com/langx/website/pull/145)
- [Stripe: designing an interactive globe](https://stripe.com/blog/globe) · [Aceternity GitHub Globe](https://ui.aceternity.com/components/github-globe) · [Magic UI Globe](https://magicui.design/docs/components/globe)
- [CodyHouse: Accessible image comparison slider](https://codyhouse.co/ds/components/info/accessible-img-compare-slider)
- [Creative Bloq: PureRef](https://www.creativebloq.com/how-to/pureref)
