# Sinopia: Decisions

| ID | Decision | Status | Affects |
|---|---|---|---|
| D-001 | Sinopia is the place-based drawing app (photo + drawing + place), replacing the earlier gesture/anatomy direction | **Decided 2026-09-27** (Ian) | Everything |
| D-002 | $0 budget: free tiers and open source only, no service that needs a credit card | **Decided 2026-09-27** (Ian) | Stack |
| D-003 | Hosting Vercel Hobby; database/auth/storage Supabase Free | **Decided 2026-09-27** (Ian) | Architecture |
| D-004 | Team split with the FirstCommit entry the same week (FirstCommit due Oct 1 05:00 PHT), and confirming the two entries are clearly different (GIBC disqualifies work "substantially the same as a previous hackathon entry") | **Resolved 2026-09-27: team of 6, all on Sinopia** | Staffing, eligibility |
| D-005 | Frontend: Vite + React + TypeScript SPA (not Next.js); Supabase called from the browser under RLS (ADR-001) | Proposed | Architecture |
| D-006 | Two storage buckets with copy-on-publish (ADR-002) | Proposed | Storage |
| D-007 | Exact location owner-only; public point derived (ADR-003); default precision `neighborhood` (~550 m grid) | Proposed | Privacy |
| D-008 | Open map stack: MapLibre + OpenFreeMap + Photon + Nominatim + Mapillary/Panoramax; no Google Maps (ADR-004) | Proposed | Maps |
| D-009 | Openverse as the only reference source, behind `/api/references` (ADR-005) | Proposed | References |
| D-010 | One report hides a fresco until the team reviews it (hackathon moderation policy) | Proposed | Safety |
| D-011 | Sign-in: Google + GitHub OAuth only (no email magic links: Supabase's built-in email sender is heavily rate-limited on free projects) | Proposed | Auth |
| D-012 | Keep the Supabase project active during judging (it pauses after 7 idle days): a teammate opens the app every 3 days, or a scheduled ping | **Resolved 2026-09-27: owner P6**, opens the app every 3 days until results are announced | Availability |
| D-013 | Unit vocabulary: *sinopia* (draft), *fresco* (finished), *Sketchbook* (private album), *Same Wall* (frescoes at one spot). Alternative for "fresco": *Bakas* | Proposed | Copy, pitch |
| D-014 | Visual direction: ink on notebook paper with one signature yellow (`#FFD139`, sampled from Quick, Draw!), Gochi Hand + Gaegu + Karla, a 2 px ink edge with a hard offset and no blurred shadows anywhere (see `design/DESIGN_BRIEF.md`, `design/SCREENS.md`) | **Revised 2026-09-28: superseded the plaster / red-ochre / Source Serif draft and applied to `web/`.** The earlier direction was an aegis-default nobody had signed off; this one is a completed design pass with a prototype, a screen spec and a sourced forbidden list. | Design |
| D-015 | Street-level view is "if time" and never shown for neighborhood-precision frescoes | Proposed | Scope, privacy |
| D-016 | Feature freeze Sep 30 18:00 PHT; submit by Oct 1 15:00 PHT | Proposed | Plan |
| D-018 | Storage policies must cover every statement the client actually issues, not just the obvious one: an upsert is `INSERT ... ON CONFLICT DO UPDATE` and needs SELECT and UPDATE as well as INSERT | **Resolved 2026-09-29** after publishing failed for every artist; `docs/schema.test.mjs` now exercises the publish path against the `globe` bucket | Storage, safety |
| D-017 | Project license: MIT for code; frescoes remain their artists' work (state this in the README and an in-app About) | **Resolved 2026-09-27: MIT for code; frescoes belong to their artists** | Legal |
| D-019 | Achievements (private per-artist milestones) and save/publish/unlock toasts, despite VALIDATION.md's "DO NOT BUILD YET" naming likes/followers/feeds and the design brief's "no rankings" rule | **Decided 2026-10-02 (Joey): build anyway**, held to the same bar as the profile's fresco count -- never compared between artists, never a score, visible only to the artist it's about. No push notifications (no service worker/VAPID setup exists); "notification" means an in-app toast | Scope, design |
