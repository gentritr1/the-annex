# Scene-first integration plan — replacing the text-panel investigation flow

Status: architecture plan only (no code written). Author verified every "current
code" claim against the files cited (file:line). The grammar this plan migrates
toward is `public/care-ward-redesign.html` (read in full). Two sibling prototypes
(deposition, small archive) are anticipated in §2/§6 but nothing here depends on
their outcome.

## 0. What the code actually is today (verified, with citations)

- The investigation workspace is a **two-column grid inside `Investigation.tsx`**:
  a `world-pane` (diorama + site-switcher) and an always-mounted `site-inspector`
  (`Investigation.tsx:726`–`1034`; grid at `styles.css:3329` — `grid-template-columns:
  minmax(0,1.55fr) minmax(330px,0.85fr)`).
- **`CaseRail` is a third column at the App level**, a sibling of the whole scene
  column, not inside Investigation (`App.tsx:361`; `case-layout` grid at
  `styles.css:686` — `minmax(0,1fr) 380px`).
- The **site inspector is always mounted** (`Investigation.tsx:870`, `ref=
  siteInspectorRef`, `tabIndex={-1}`). Methods are gated behind the room phase, not a
  "enter the site" step (`roomMethodsRevealed` derivation `Investigation.tsx:524`–
  `531`; matches the project scar `annex-investigation-inspector-always-mounted`).
- **The in-scene zones that already exist are decorative, not interactive.**
  `SiteCloseupStage` renders a `<figure aria-hidden="true">` (`SiteCloseupStage.tsx:157`)
  whose `.site-closeup-zone` elements are **`<div>`s**, not buttons
  (`SiteCloseupStage.tsx:240`–`252`). They **mirror** the canonical `ChoiceButton`s that
  live in the inspector (`Investigation.tsx:1003`–`1030`). So today there are **two
  renderings of each method**: decorative plate zones + canonical DOM buttons. This
  duplication is the thing control-unification collapses.
- Hover/focus preview **already flows**: `ChoiceButton.onAttentionChange`
  (`ChoiceButton.tsx:85`–`92`) → `previewActionId` (`Investigation.tsx:1018`) →
  `SiteCloseupStage activeActionId` → zone `data-state='active'` and
  `rainPresence.actionTreatments[actionId]` → `'listening' | 'pressure'`
  (`SiteCloseupStage.tsx:141`, `rainPresence.ts:18`–`38`).
- Arm/confirm is `ChoiceButton`'s two-step (`requiresConfirmation`,
  `ChoiceButton.tsx:58`–`64`); three silent disarm gestures already exist
  (`ChoiceButton.tsx:41`–`56`).
- The footer CTA is a pure function, unit-tested, and **already returns `null` while
  the live method list is on screen** (`fieldCta.ts:47`–`76`; tests
  `fieldCta.test.ts:62`–`72`). `sceneStateFor` is likewise pure/unit-tested
  (`sceneState.ts:29`, `sceneState.test.ts`).
- Rooms (`ClassificationRoom`, `AcousticShadowRoom`, `CustodyRailRoom`) are a **pure
  reducer + a DOM console in the inspector + decorative plate stagecraft** driven by
  view-local presentation state reported up via `onRoomPresentationChange`
  (`ClassificationRoom.tsx:85`–`87`, consumed at `Investigation.tsx:965`–`997`;
  stagecraft at `SiteCloseupStage.tsx:419`–`475`). The rooms already have the
  scene-first split half-built: DOM controls + a plate that echoes them.
- **`Deposition` is the template for staged delivery already in the tree**: a portalled
  `aria-modal` tray docked to the bottom, performing over an *uncovered* stage, with
  `DepositionBeatStage` as a pointer-inert `aria-hidden` beat visual derived entirely
  from view-local beat state (`Deposition.tsx:217`–`230`, `DepositionBeatStage.tsx:19`–
  `92`).

The load-bearing consequence: **most of the scene-first machinery already exists as
view-only derivation.** The migration is mostly (a) promoting the decorative zones to
be the real buttons, (b) adding a staged beat player, and (c) re-homing panels over
the plate — not new game logic. The reducer is never touched (binding constraint).

---

## 1. Layout migration — scene becomes dominant

**Recommendation: migrate inside-out, deferring the App-level grid change to last.**
Phase 1 changes nothing above `Investigation`'s `field-workspace`; the App
`case-layout` and `CaseRail` stay put until the per-site grammar is proven (§5).
Rationale: the smallest seam that ships a real, playable pilot is a per-site branch
in Investigation, not a global relayout.

**The scene-dominant workspace (per migrated site):**

- The `world-view` plate fills the workspace; the current `site-inspector` **method
  block** is removed for that site and its role is taken by in-scene zones (§2).
  Rationale: the plate is already the primary picker (`Investigation.tsx:733`–`767`);
  scene-first just lets it also host the choice.
- **Inspector prose collapses into two destinations**, preserving the always-mounted
  canonical DOM (the always-mounted scar forbids gating content behind a world-view
  toggle):
  1. **In-scene captions** on each zone — the prototype's `cap-title / cap-detail /
     cap-arm` (`care-ward-redesign.html:312`–`337`) carry `methodLabel` + `description`
     + the arm hint. This is the sighted default.
  2. **A summonable detail drawer/overlay** — one button in the scene ("Case detail")
     opens a drawer holding the full `description`, `consequence`, filed-result card,
     and `ReactionQuotes` (the exact text at `Investigation.tsx:891`–`959`). This is the
     canonical text surface for AT and detail-readers, always reachable, never removed.
     Recommendation: it is a real focus-trapped `dialog` reusing the `Deposition` tray
     pattern (`Deposition.tsx:217`), not a CSS-hidden panel.
- **`CaseRail` becomes a summonable case-file overlay** (§5 phase 8): a scene button
  opens the existing `CaseRail` component as a right-docked drawer. Rationale: the rail
  is already a self-contained column (`App.tsx:361`); wrapping it in a summon is a
  container change, not a rewrite. This is the **one** place the redesign reduces
  always-on density → Open Question 3.
- **The `fieldCta` footer stays a slim persistent dock** below the plate. No logic
  change: it *already* returns `null` when `methodsVisible` (`fieldCta.ts:67`), and in
  scene-first mode the zones **are** the visible methods, so `methodsVisible=true`
  during the choice → the footer CTA correctly vanishes, then returns as "Open memory
  lattice" / "Complete one more site" after commit. The existing pure function fits the
  new layout unchanged; only its container styling moves.

**375px assessment (verified against existing breakpoints):** the workspace already
collapses to a flex column at narrow widths (`styles.css:5984`). Scene-first goes
**full-bleed** here, exactly as the prototype does (`care-ward-redesign.html:510`–`522`:
plate → `100vw/100vh`, zones reflow to `left:22%/78%`, beat width `84%`, result strip
stacks). The detail drawer and case-file overlay become full-height sheets. The
`fieldCta` dock becomes a single-line bottom strip. No horizontal scroll: zones use
`%` anchors and `transform: translate(-50%,-50%)` (prototype `.zone`,
`care-ward-redesign.html:215`–`235`).

---

## 2. Control unification — the zones become the canonical buttons

**Recommendation: promote the authored zones to host the REAL `ChoiceButton`, and
delete the decorative mirror for migrated sites — one control per method, never two.**

- The authored anchors already exist: `SiteDefinition.closeup.zones` maps
  `actionId → {x,y}` (`types.ts:606`–`610`; Care ward values `case77.ts:804`–`807`:
  `listen-mara` `0.23,0.56`, `stress-test` `0.78,0.54` — identical to the prototype's
  `zone-listen`/`zone-pressure`). These become the **positions of the real buttons.**
- New wrapper **`src/components/SceneZone.tsx`**: absolutely positions a `ChoiceButton`
  at an anchor and applies the ring/cap visual grammar (`variant="zone"`). **Do not
  fork `ChoiceButton`** — reuse it so arm/confirm (`ChoiceButton.tsx:58`), the three
  disarm gestures (`:41`–`56`), `onAttentionChange`→preview, and the unchanged commit
  path all come for free. The ring/cap CSS is ported from the prototype
  (`care-ward-redesign.html:237`–`341`) into `styles.css` scoped to `.scene-zone`.
- **Accessibility seam (critical):** the real buttons must live **outside** the
  `aria-hidden="true"` figure (`SiteCloseupStage.tsx:157`), or that subtree is hidden
  from AT. Recommendation: keep `SiteCloseupStage` decorative-and-hidden as-is for the
  raster/stagecraft, and render the `SceneZone` buttons as a **sibling** interactive
  layer over the plate (a new `.scene-zones-live` in `Investigation`), not inside the
  figure. The decorative `.site-closeup-zone` divs are then **removed for migrated
  sites** (a prop `interactiveZones` on `SiteCloseupStage` suppresses them) so nothing
  double-renders. Keyboard: the `SceneZone` buttons are real buttons in DOM order,
  Tab-navigable, Enter-to-arm, Enter-to-commit — the same canonical path, satisfying
  "same buttons, not a parallel input system."

**Plain sites vs close-read rooms (reconciliation so nothing double-renders):**

- **Plain 2-method sites** (Care ward `case77.ts:795`–`815`; and the plain field
  sites): `SceneZone` hosts the two method buttons directly. This is Phase 1.
- **Room sites** (classification / acoustic / custody): the room ritual is genuinely
  multi-control and sequential — it cannot become two ring-zones. Reconcile by
  **re-homing the existing room DOM console over the plate** (a bottom "console"
  docked like the `Deposition` tray, `Deposition.tsx:231`) while the **existing plate
  stagecraft stays decorative and unchanged** (`RoomStagecraft` et al.,
  `SiteCloseupStage.tsx:419`). The room's **terminal** method choice adopts the
  `SceneZone` grammar. Double-render is already prevented by existing CSS: the plate's
  method zones are suppressed for every phase but the terminal one
  (`styles.css:2713`, `:2721`, `:2728` — suppress until `unlocked` / `route-ready` /
  `methods`). So during the ritual only the console shows; at unlock the console yields
  to the two method zones; the stagecraft rides throughout. **This means rooms need
  only a re-home of *where* the console renders plus zone styling at unlock — no
  reducer or room-logic change** (view-only constraint holds).

---

## 3. Staged dialogue delivery

**Recommendation: a new `src/scene/BeatStage.tsx` that owns line sequencing, fed by an
assembler that reads EXISTING content fields — zero content-schema change for the
pilot.**

- **Where it lives / what it does:** `BeatStage` is a controlled presentational
  component (the prototype's beat player, `care-ward-redesign.html:707`–`776`, made
  React). It stages lines with length-scaled holds (`lineHold()`,
  `care-ward-redesign.html:643`–`645`), renders all lines at once under reduced motion
  (`:715`–`721`), and advances on click/any-key (`:748`–`762`). Its beat-line styling is
  shared with `DepositionBeatStage` so the two readers look like one system.
  `Investigation` renders it **after** `handleCommitAction`, replacing today's
  "scroll to the filed card" reveal (`Investigation.tsx:376`–`381`) with a staged
  in-scene reveal, then the prototype's result strip (evidence admitted + standing,
  `care-ward-redesign.html:766`–`776`).
- **Strings flow from existing authored fields — no schema change:** the "her" lines
  come from `action.eventDetail`, the persona lines from `action.reactions[]` (persona +
  line). Verified 1:1 against the prototype: Care ward `listen-mara.eventDetail`
  (`case77.ts:256`) + `reactions[0]` (`:259`–`264`) are exactly the prototype's staged
  lines (`care-ward-redesign.html:603`–`616`). A pure helper
  **`src/game/beats.ts` `assembleBeats(action)`** splits `eventDetail` into clauses and
  appends `reactions`, unit-tested like `fieldCta`.
- **If hand-tuned pacing is wanted, add ONE optional additive field** —
  `FieldActionDefinition.beat?: readonly { speaker?: PersonaId; text: string }[]` —
  and have `assembleBeats` prefer it, falling back to the eventDetail/reactions
  assembly. **No save migration is needed:** field-action definitions are *static
  content*, never part of persisted `GameState` (`persistence.ts` only serializes
  GameState; `CURRENT_SAVE_SCHEMA` at `:28`). The no-schema-bump tolerance pattern to
  cite is `depositionRecord`'s optional decode (`persistence.ts:209`, `:345`–`352`:
  absent tolerates to null). Adding a content-definition field is even safer than that
  — it touches no save at all. This is Open Question 2.
- **The event log / rail stays complete:** the commit path is **unchanged**
  (`onCommitAction` → `dispatch COMMIT_FIELD_ACTION`, `App.tsx:327`). `BeatStage` is
  purely presentational and fires **after** the dispatch, over already-updated state.
  The reducer still writes `events`, evidence, and trust exactly as today, so the
  debrief and `engine.test`/`content.test` read an identical record. **Hard rule:
  `BeatStage` must never gate or defer the dispatch** — commit first, then reveal (this
  is the §6 risk-4 assertion).

---

## 4. Ambient preview states

**Recommendation: generalize the Care-Ward `rainPresence` mechanism into a per-site
`previewTreatment` keyed by action id, resolved by a pure fn, applied as a plate
`data-preview-treatment` attribute driving CSS custom-property state-sets.**

- The mechanism already exists twice as per-action treatment maps: `rainPresence.
  actionTreatments` (`types.ts:622`–`627`, `'listening'|'pressure'`) and
  `custodyRail.actionTreatments` (`types.ts:447`, `'chain'|'return'`). `rainPresence.ts`
  is the template resolver: pure, resolved-wins-over-preview, unknown-action → idle
  (`rainPresence.ts:18`–`38`).
- **Generalize:** add optional `closeup.previewTreatment?: Record<FieldActionId,
  TreatmentToken>` (or reuse `zones[].treatment`) and a pure
  **`src/scene/previewTreatment.ts` `resolvePreviewTreatment(def, activeId,
  resolvedId)`** mirroring `resolveRainPresenceState`. Output sets
  `data-preview-treatment` on `.site-closeup-stage`.
- **CSS state-sets in absolute authored values**, ported from the prototype's
  `:root` spec (`care-ward-redesign.html:26`–`47`: `--rain-op-*`, `--rain-blur-*`,
  `--tint-*`, `--vignette-*`, `--rain-fall-*`) and the `[data-state="listen|pressure"]`
  selectors (`:88`–`182`). These become `[data-preview-treatment="listen|pressure"]`
  rules scoped per site's atmosphere. Absolute values, per the harness rule against
  multipliers on small constants — the prototype already specs them absolutely.
- Opt-in per site: sites with no `previewTreatment` render `data-preview-treatment`
  unset and are visually untouched. `rainPresence` remains the Care-Ward-specific
  instance and is subsumed, not deleted, on migration.

---

## 5. Migration sequence (ordered, each individually shippable)

Every step keeps all tests green and the game fully playable. Sizes S/M/L.

1. **(S) BeatStage + assembler scaffold, unwired.** New `src/scene/BeatStage.tsx`,
   `src/game/beats.ts` (`assembleBeats`), `src/game/beats.test.ts`. No behavior change.
2. **(S) previewTreatment resolver, unwired.** New `src/scene/previewTreatment.ts` +
   test, mirroring `rainPresence.ts`. No behavior change.
3. **(M) Pilot: Care ward 12 scene-first, behind the smallest seam.** A view-level
   capability branch in `Investigation.tsx` (site is plain + `closeup.zones` present +
   an opt-in predicate — no content-schema flag needed initially). Render `SceneZone`
   buttons (new `src/components/SceneZone.tsx`) at the authored anchors, **replacing**
   the inspector `site-actions` for that one site; suppress the decorative zones via a
   `SiteCloseupStage` prop; wire commit → `BeatStage` reveal; move inspector prose into
   a summonable detail drawer. Port ring/cap/beat CSS into `styles.css`. `fieldCta`
   footer unchanged. Files: `Investigation.tsx`, `SceneZone.tsx`, `SiteCloseupStage.tsx`
   (suppression prop), `BeatStage.tsx` (wire), `styles.css`.
4. **(M) Ambient preview for the pilot.** Author Care-Ward `previewTreatment`; port the
   prototype's tint/vignette/wash/rain absolute state-sets into `styles.css` scoped to
   the pilot; drive via `resolvePreviewTreatment`. Verify with runtime `getComputedStyle`.
5. **(S) Reduced-motion / high-contrast / forced-colors pass for the pilot.** Reuse the
   existing `sceneMotionReduced` and `osForcedColors` signals (`Investigation.tsx:180`,
   `:193`–`198`, `:792`–`802`). Static beat path (all lines at once), no rain drift,
   instant state switch. Re-verify keyboard-only completion.
6. **(M) Rooms reconciliation, one at a time (classification → acoustic → custody).**
   Re-home each room's DOM console over the plate; terminal method choice adopts
   `SceneZone`. No reducer/room-logic change. Files: the three room components' wrapper
   markup + `Investigation.tsx` branch + `styles.css`.
7. **(M) Deposition alignment.** It already docks a tray over an uncovered stage with a
   beat visual (`Deposition.tsx:217`); share `BeatStage`'s beat-line styling and the
   result-strip grammar. Structural change: none.
8. **(M/L) Layout: CaseRail → summonable overlay + inspector detail-drawer generalized;
   App `case-layout` collapses to scene-dominant single column.** The largest layout
   change, done once the per-site grammar is proven. Files: `App.tsx`, `CaseRail.tsx`
   (overlay wrapper), `styles.css`. Full 375px full-bleed pass here.
9. **(S) Flip remaining plain sites; delete the old inspector `site-actions` path** once
   every site is migrated.

---

## 6. Risks (top 5, each with a detection/verification method)

1. **Opacity-strand reveal (documented scar).** A zone/beat reveal carried by an
   opacity ramp with `animation-fill-mode: both` can strand at its 0% frame on
   re-entry (memory `annex-scene-opacity-strand`; the existing warning at
   `styles.css:2733`–`2736`). **Detection:** all reveals use `clip-path` / `transform`
   / `translate`, never opacity+fill:both. **Verify:** re-enter the pilot site twice
   and screenshot the zones and beat visible (the repo already carries before/after
   `evidence/*.png` captures for exactly this class of check).
2. **CSS-cascade override inside existing containers.** New `.scene-zone` / beat CSS
   injected into `.world-view` / `.site-closeup` may be beaten by existing source-order
   rules (the inspector override precedent, `styles.css:1114`–`1123`) or lose an oklch
   contrast probe (memory `annex-mvp-design-review`). **Detection/verify:** read
   **computed** styles at runtime via `getComputedStyle` on the mounted zone — not the
   authored rule — and **disable the transition before probing** transitioned props
   (memory `annex-transition-clock-measurement`: the pane reads the START frame).
3. **AT / keyboard regression from promoting decorative zones to real buttons.** If the
   buttons land inside the `aria-hidden` figure (`SiteCloseupStage.tsx:157`) they vanish
   from AT; if the decorative mirror is not suppressed, methods double-announce. The
   always-mounted scar (`annex-investigation-inspector-always-mounted`) means the
   canonical DOM must never be gated behind the world view. **Verify:** re-run
   keyboard-only completion **per step** (Tab to zone → Enter arms → Enter commits →
   beat advances via key), plus a screen-reader smoke that each method is announced
   exactly once. Headless keyboard recipe exists (memory `annex-shelf-zero-room`).
4. **Event-log / debrief incompleteness if the beat intercepts the commit.** A
   scene-first commit that defers or swallows `dispatch(COMMIT_FIELD_ACTION)` would
   leave `state.events` / evidence / trust incomplete, breaking the debrief and
   `engine.test` / `content.test`. **Detection:** commit fires on confirm, independent
   of `BeatStage`. **Verify:** a new view test commits **through the `SceneZone`** and
   asserts the resulting reducer output (`state.events` length, evidence admitted,
   trust deltas) is **identical** to the pre-redesign `site-actions` path; run
   `engine.test`/`content.test` unchanged. The reducer stays untouched (view-only).
5. **Preview-pane synthetic-event and stale-frame quirks during verification.**
   Synthetic clicks don't reach React (must use `el.click()`), and the browser pane can
   serve a frozen capture frame while the DOM is healthy (memories
   `annex-preview-pane-quirks`, `browser-pane-stale-screenshot`). **Detection/verify:**
   drive hover-preview and armed states via real events / keyboard, confirm state via
   `read_page`/JS rather than screenshot alone, and reload to clear a stale capture.
   Tag any preview-only observation as preview, and mark device/real-input confirmation
   separately (harness §1: preview ≠ device).

---

## Open questions for the user

1. **Inspector-collapse scope.** Should the full inspector prose (description,
   consequence, `ReactionQuotes`) survive as a summonable **detail drawer on every**
   scene-first site (my recommendation, for AT + detail-readers), or is the in-scene
   caption + result strip sufficient with the drawer only as a fallback? This is an
   AT-policy + density taste call.
2. **Staged-dialogue authoring.** Ship the pilot on **beats assembled from existing
   `eventDetail` + `reactions`** (zero schema change, but the clause split is
   editorial and the prototype's hand-tuned lines differ slightly from raw
   `eventDetail`), or add the **optional additive `action.beat[]`** field from the
   start so the pilot's pacing is hand-authored? (No migration risk either way.)
3. **CaseRail fate.** Confirm the rail's case/evidence/log tabs should move **behind a
   summon** in scene-dominant mode rather than staying persistently visible on wide
   desktops. This is the single place the redesign lowers always-on information
   density.
