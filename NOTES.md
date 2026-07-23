# Acoustic Shadow — implementation notes (Case 77 Maintenance Spine)

Transforms the Maintenance Spine from a static plate + two immediate ChoiceButtons
into **Acoustic Shadow**: a deterministic, view-local, turn-based three-checkpoint
stealth route-planning interaction. The two canonical field actions
(`walk-acoustic-shadow`, `forge-authority`) and all engine/persistence/world/motion
files are untouched.

## Concept evaluation (as required before implementation)

I played the current Maintenance Spine (dev server, port 4174 — 4173 was in use)
and confirmed the present failure: selecting the site shows a static plate and the
two methods immediately, then commit. No spatial reading, no reconnaissance.

Three implementations of the Acoustic Shadow idea, scored against the brief's seven
criteria (discovery through spatial action; no reaction-time; visual use of the
corridor; keyboard/touch/reduced-motion parity; no canonical-state expansion;
bounded inspector geometry; semantic fit with both methods):

1. **Turn-based shadow crossing (SELECTED).** Advance a manual sensor pulse
   ("Listen for the next pulse"), read which of two physically named bands the beam
   currently reaches, and cross on the blind interval where the rain masks a band.
   Discovery is spatial (advancing pulses, reading exposures), no clock, uses the
   corridor's near→mid→far depth as mechanical progress, all controls are native
   buttons (full parity), no canonical mutation (pure reducer), one checkpoint on
   screen at a time (bounded), and learning the sensor ecology + noticing the dead
   credential seats **both** methods. Passes every criterion.
2. **Manually scrubbed sensor-cycle reconstruction.** Scrubbing a pulse timeline to
   find the gap. Reads as "moving a token across a diagram" — the corridor becomes a
   chart, which the brief explicitly rejects. Weaker "occupy a place" feel. Rejected.
3. **Spatial acoustic triangulation.** Placing/reading listening points. Trends
   toward floating HUD panels and measurement/arcade feel (both forbidden), and is
   harder to keep legible while muted and geometry-fixed. Rejected.

Turn-based shadow crossing was the preferred baseline and won on the criteria, so it
was implemented (not left as a proposal).

## Intended feeling

Occupying a dangerous civic corridor and *reading* it: you stand in foreground
cover, watch the rain break the sensor sweep in a repeatable cadence, and time three
short crossings on the shadows the rain holds. Cyan is what the archive can hear;
darkness/rain is what it does not record. Progress marches into the perspective
(near → mid → far gate). Only after the route is plotted does attention drift right
to the sealed amber service door, which answers your presence with one faint tick —
seating the forge-authority option without activating it. The two methods then arrive
morally unresolved and comparable in weight.

## Architecture (mirrors the Small Archive classification room, own vocabulary)

- `src/game/acousticShadow.ts` — pure deterministic reducer (no React/DOM/Date/
  Math.random/timers). State: `checkpointIndex`, `pulseIndex`, `attempts`,
  `routeReady`, `lastAnnouncement`. Events: `LISTEN`, `CHOOSE_BAND`. Derived helpers:
  `acousticShadowPhase`, `acousticShadowPlate`, `acousticShadowStageFor`,
  `acousticShadowUnlocked`. Strict identity no-ops for invalid/out-of-order events.
- `src/game/acousticShadow.test.ts` — 12 reducer tests (determinism, pulse
  advancement, exposed-band no-progress, masked-band advancement, unknown/out-of-order
  no-ops, exact route-ready boundary, methods-locked-before-ready, remount reset,
  phase→stage mapping).
- `src/game/types.ts` — `ACOUSTIC_SHADOW_STAGES` / `ACOUSTIC_SHADOW_PHASES` const
  vocabularies, `AcousticShadow*` definition + plate-state interfaces, and a new
  optional `acousticShadow?: AcousticShadowRoomDefinition` on `SiteDefinition`
  (sibling to `room?`, not a widening of it).
- `src/game/cases/case77.ts` — authored `maintenanceAcousticShadow` (three
  checkpoints, two named bands each, a 3-pulse cycle with exactly one blind interval
  per checkpoint, per-phase acoustic treatments based on the maintenance portal's
  acoustics), attached to the maintenance site. The two field actions and every
  evidence/effect are byte-identical.
- `src/components/AcousticShadowRoom.tsx` — thin view over the reducer: one live
  `role="status"` region, the `pendingFocusRef` + `FOCUS_CHAIN` focus mechanism
  copied from ClassificationRoom, phase-swapped tableau, methods via `ChoiceButton`
  (`requiresConfirmation`, `suppressLiveRegion`).
- `src/scene/SiteCloseupStage.tsx` — new aria-hidden, pointer-inert decorative
  overlays (`AcousticShadowStagecraft` + `AcousticShadowResolved`), `data-acoustic-phase`,
  and focus-point drift by phase→zone. Kept separate from the classification props.
- `src/components/Investigation.tsx` — site-keyed, view-local integration exactly
  like ClassificationRoom (reset in `selectSite`/`returnToConcourse`), plus the
  room's per-phase acoustic treatment reported through the SAME existing
  `onAcousticTreatmentChange` callback while the room is active (portal derivation
  restored on leave).

## Verification (tagged; a reviewer should re-run)

- **Commit-payload byte-identity — VERIFIED.** Captured the pre-change baseline
  BEFORE editing (a temporary `src/game/_acousticShadowBaseline.gen.test.ts`, run via
  `vitest`, importing the real engine reducer, applying `COMMIT_FIELD_ACTION` for both
  methods from a deterministic pre-commit state → `evidence/acoustic-shadow-commit-baseline.json`).
  Re-ran after implementation → `evidence/acoustic-shadow-commit-after.json`.
  `diff` is empty (exit 0). The temporary generator was then deleted (it pulled node
  builtins into `tsc`); it is not part of the shipped suite.
- **Canonical effects frozen — VERIFIED (tests).** `engine.test.ts` adds a "Maintenance
  Spine canonical field-action effects (frozen)" block asserting the exact evidence
  ids, trust deltas, alarm deltas, override grant, method tags, and event title/tone
  for both actions.
- **Reducer correctness — VERIFIED (tests).** `acousticShadow.test.ts`, all 12 pass.
- **Content invariants — VERIFIED (tests).** `content.test.ts` adds a generic
  acoustic-shadow completeness walk (3 checkpoints, 2 bands, one blind interval each,
  bounded per-phase acoustics, zone/stage validity, both methods reachable), a Case-77
  reachability check against the recursive string-walk, and a narrative-boundary check
  proving the room copy does not leak either method's exclusive finding before commit.
- **Fixed geometry / zero inspector overflow — VERIFIED (runtime, 1280×800, CSS
  transitions disabled).** `evidence/acoustic-shadow-geometry.json`: tableau height is
  a constant 384px across survey, all three checkpoints, route-ready, and both armed
  method states; inspector overflow is 0 in every state; inner stage overflow ≤1px.
  (Getting route-ready + an armed method to fit 384px required compressing the
  route-ready copy — see "weaker than intended" below.)
- **Focus never falls to body — VERIFIED (runtime).**
  `evidence/acoustic-shadow-focus-targets.json`: after each of the first two crossings
  focus lands on `.as-reading`; after the third it lands on the first method
  (`.choice-row`); at route-ready it is on the first method. Never `BODY`.
- **Keyboard operability with trusted keys — VERIFIED (runtime).**
  `evidence/acoustic-shadow-keyboard-operability.json`: a trusted **Space** on the
  focused Listen button advances the pulse, and a trusted Space on the focused masked
  band crosses the checkpoint. (Note: the controls are native `<button>`s, so physical
  Enter/Space activate them natively — no custom key handler. Trusted CDP *Enter*
  did not synthesize native activation in headless Chrome, so the Space probe is the
  keyboard proof; the full three-checkpoint path + two-step armed commit was driven
  via trusted input and captured in `acoustic-shadow-focus-targets.json`.)
- **Exposure conveyed beyond colour — VERIFIED (runtime + screenshots).** Each band
  shows a state word ("Rain-masked · cross here" / "Beam-exposed · the beam reaches it
  first") plus structure (masked = cyan border + diagonal-hatch occluded reflection;
  exposed = thin reflective sheen; a "waited" corner tick after an exposed attempt).
  High contrast adds a non-colour outline on the masked band
  (`acoustic-shadow-high-contrast-1280x800.png`).
- **Plate label suppression — VERIFIED (runtime).** The plate's STEALTH and
  FRAUD / SYSTEMS zone labels are `opacity:0` through survey and every crossing and
  return only at route-ready (methods unlocked).
- **Resolved closeups distinguish the outcomes without labels — VERIFIED
  (screenshots).** `acoustic-shadow-resolved-walk-1280x800.png` shows one quiet dashed
  broken interval in the corridor cadence with the credential door dormant;
  `acoustic-shadow-resolved-forge-1280x800.png` shows the amber credential aperture
  answering while the sensor chain stays intact. Neither reads as the "correct" route.
- **Mobile 375 / large text / reduced motion / muted — VERIFIED (runtime +
  screenshots).** 375px: no horizontal overflow, band/listen targets ≥44px
  (`acoustic-shadow-mobile-375.png`, `…mobile.json`). Large text: inspector overflow 0,
  room grows/scrolls, no horizontal clip. App and OS reduced motion render the discrete
  static pulse states (`…reduced-motion-app…`, `…reduced-motion-os…`). The whole
  evidence run is ambience-OFF (default `ambientSound === false`), so every state is
  proven legible while muted.
- **Lint / tests / build — VERIFIED.** `npm run lint` clean; `npm test` — 8 files,
  all pass (10 new: 12-in-1 acoustic reducer file counts as one file; new engine +
  content blocks included); `npm run build` succeeds (the only warning is the
  pre-existing Three.js chunk-size notice, unrelated to this change).

Runtime evidence lives under `evidence/acoustic-shadow/` (screenshots + JSON +
transcript) and `evidence/acoustic-shadow-commit-{baseline,after}.json`.

## What still needs a human audition

- **Game feel.** The mechanic, legibility, focus, and geometry are verified, but
  whether the crossing *feels* like reading a dangerous place (rather than clicking
  "the one labelled Masked") is a taste call. The exposure word is intentionally shown
  (the brief asks for "concise text", and it keeps the interaction accessible and
  non-guessy), so the challenge is spatial reading + timing the pulse, not hidden
  information. Please eyeball whether that lands or feels too easy.
- **Decorative plate stagecraft.** The near/mid/far checkpoint registrations, the
  per-pulse rain-shadow occlusion, and the resolved broken-interval / amber-aperture
  overlays are subtle by design (the DOM text carries all meaning). Confirm they read
  on the actual raster and aren't lost — see the screenshots.
- **Acoustic treatment.** The per-phase hum/rain deltas are authored and wired through
  the existing callback, but I did not verify them audibly (ambience is default-off and
  the harness is muted). Mark this audio-only claim UNVERIFIED until heard on device.

## Weaker than intended / trade-offs

- **Route-ready copy compression.** The inspector affords the room only ~384px at
  1280×800 (the site header takes the rest), and an *armed* method grows the button by
  ~30px. To keep the tableau fixed at 384 with zero inner scroll in every state
  (including both armed methods), I dropped a separate "methods lead" paragraph and
  trimmed the route-ready and credential lines to be tighter than first drafted. The
  meaning is intact (a concise route-ready line + a restrained amber credential line),
  but the credential beat is terser than the richer version I originally wrote.
- The decorative overlays are deliberately restrained; if a reviewer wants them more
  present, that is a follow-up tuning pass, not a mechanic change.

## Deviations

- **Zero-diff list: none.** `engine.ts`, `persistence.ts`, `scene/motion.ts`,
  `world/*`, and the existing action/evidence definitions in `case77.ts` are all
  unchanged.
- **Tooling deviation (honest).** The brief preferred the in-app preview tools for
  runtime evidence. In this environment the preview MCP is anchored to a *different*
  project root, so I could not point it at the Annex dev server by name. I started the
  Annex dev server and captured measurements/screenshots with a Node + raw-CDP script
  (`evidence/acoustic-shadow-evidence.mjs`) — the same pattern the repo's existing
  `evidence/armed-commit.mjs` uses — and additionally sanity-drove the live app through
  the in-app browser pane (real reducer flow, not frozen frames). All computed-style/
  geometry reads were taken with CSS transitions disabled.
- **Node version for the evidence script.** The script uses the global `WebSocket`
  (Node ≥22). The repo's default `node` is 20.19; I ran the script with the installed
  `node v24.18.0`. This affects only the out-of-band evidence runner, not the app,
  build, or tests.

Git was left untouched: the working tree is dirty and nothing was committed or staged.
