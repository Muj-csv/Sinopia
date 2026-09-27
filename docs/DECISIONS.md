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
| D-014 | Visual direction: plaster ground, sinopia red-ochre accent, spolvero charcoal, Source Serif 4 + IBM Plex Sans (see `design/DESIGN_BRIEF.md`) | **Accepted for the hackathon 2026-09-27; revisit after judging** | Design |
| D-015 | Street-level view is "if time" and never shown for neighborhood-precision frescoes | Proposed | Scope, privacy |
| D-016 | Feature freeze Sep 30 18:00 PHT; submit by Oct 1 15:00 PHT | Proposed | Plan |
| D-017 | Project license: MIT for code; frescoes remain their artists' work (state this in the README and an in-app About) | **Resolved 2026-09-27: MIT for code; frescoes belong to their artists** | Legal |
