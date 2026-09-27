# Phase 5: If-time items + submission

**When:** 5a until **Sep 30 18:00 PHT** (feature freeze); 5b until **Oct 1 15:00 PHT** (submit). **Owners:** P4 (5a street view), Ian (5a safety), P6 leads + everyone (5b).
**Implements:** FR-015, FR-016, FR-017 (optional); NFR-006, NFR-007; Definition of Done (PRD §13).

## 5a: only if Phases 0–4 are green by Sep 29 22:00 (each ships whole or not at all)
1. **FR-015 street-level view:** Mapillary Graph API `images?bbox=` (±0.0006°) → nearest image ≤ 60 m → MapillaryJS viewer beside the fresco; fallback Panoramax search → viewer; else map + "No street-level imagery here yet". Never for neighborhood-precision frescoes. Show CC BY-SA attribution.
2. **FR-016 safety check:** lazy-load nsfwjs at publish; block and explain if flagged.
3. **FR-017 weather:** Open-Meteo historical call at save; "light rain, 24°C" on the card.

## 5b: submission
1. Accessibility pass: keyboard path through capture → draw → finish → publish → globe → viewer; contrast via tokens; alt text; reduced motion.
2. Show the app to 5 artists outside the team; write down one reaction (with permission) for the video and Devpost.
3. Keep-alive (D-012): assign who opens the app every 3 days during judging.
4. README: mark features Done, confirm setup steps, add the live URL, team names, license (D-017); remove the draft notice.
5. 2–5 min English video (IMPLEMENTATION_PLAN "Demo video"), ≥ 3 screenshots (globe, drawing with references, viewer with slider + Same Wall), Devpost description with the full Built With list (ARCHITECTURE §6) and every member's real full name. Submit.

## Acceptance
All six GIBC items present; the deployed URL works from a fresh browser on a phone; submitted by Oct 1 15:00 PHT.

Stop and report the submission link.
