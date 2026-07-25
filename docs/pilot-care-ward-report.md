# Care ward 12 — scene-first pilot (steps 1–5 of the integration plan)

Implements `docs/scene-first-integration-plan.md` §1–§5 against the live app. The
reference experience is `public/care-ward-redesign.html`.

**Status of the three gates after every step:** `npx vitest run` **271 passed**
(248 before this work), `npx tsc -b` clean, `npx eslint .` clean.

**Live evidence:** `node scripts/evidence-pilot-care-ward.mjs http://127.0.0.1:3000/ <seed-save.json>`
→ **53 checks passed / 0 failed**, screenshots + `pilot-evidence.json` in
`evidence/pilot-care-ward/`. Run under headless Chrome over raw CDP (node ≥ 22 —
node 20 has no global `WebSocket`).

Every claim below is labelled **EXECUTED** (a command was run and its output
observed) or **INFERRED** (read from code, not run). No feel claims are made
anywhere in this document — the audition is the user's.

---

## Per-step files and verification

### Step 1 (S) — BeatStage + assembler scaffold, unwired

| file | change |
|---|---|
| `src/game/beats.ts` | new — `BeatLine`, `assembleBeats`, `beatHoldMs`, `splitClauses` |
| `src/game/beats.test.ts` | new — 11 cases |
| `src/scene/BeatStage.tsx` | new — the staged reveal component |
| `src/game/types.ts` | additive `FieldActionBeat` + `FieldActionDefinition.beat?` |
| `src/game/cases/case77.ts` | hand-authored `beat[]` for `listen-mara` and `stress-test` |

- **EXECUTED** `npx vitest run` → 259 passed; `npx tsc -b`, `npx eslint .` clean.
- **EXECUTED** The authored beats reproduce the prototype's staged lines exactly.
  The live app emitted, in order (from `pilot-evidence.json` → `beatLines`):
  `“It rained on the window all night,” she told you.` / `“There was no window.` /
  `Write down that I know that.”` / `The Shepherd —` / `You let her finish before you measured her.` /
  `She was a person in that room, not a file.` / `I’ll remember the order you chose.`
  — the same seven lines as `care-ward-redesign.html:603`–`616`.
- **EXECUTED** `beatHoldMs` = `clamp(1700, 900 + 45·chars, 4500)`, asserted at both
  clamps and in the linear middle (`beats.test.ts`).
- **INFERRED** (read, not run) No save migration is needed: `persistence.ts`
  serializes `GameState` only, and field-action definitions are static content.
  The 20 existing `persistence.test.ts` cases still pass unchanged.

### Step 2 (S) — previewTreatment resolver, unwired

| file | change |
|---|---|
| `src/scene/previewTreatment.ts` | new — `resolvePreviewTreatment`, mirrors `rainPresence.ts` |
| `src/scene/previewTreatment.test.ts` | new — 4 cases |
| `src/game/types.ts` | `PREVIEW_TREATMENTS` vocabulary + `closeup.previewTreatment?` |

- **EXECUTED** `npx vitest run` → 263 passed; tsc + eslint clean.
- **EXECUTED** Resolved-wins-over-preview and unknown-action-→-rest are asserted,
  as in `rainPresence.test.ts`.

### Step 3 (M) — the pilot seam

| file | change |
|---|---|
| `src/components/SceneZone.tsx` | new — **wraps** `ChoiceButton` (does not fork it) at an authored anchor |
| `src/components/SceneDetailDrawer.tsx` | new — focus-trapped `dialog`, Deposition tray pattern |
| `src/components/SceneZone.commit.test.tsx` | new — the event-log identity test (jsdom) |
| `src/scene/closeupGeometry.ts` | new — the ONE source of the plate's projection geometry |
| `src/scene/SiteCloseupStage.tsx` | `interactiveZones` suppression prop; uses the shared geometry |
| `src/components/Investigation.tsx` | the seam: live zones, beat lifecycle, result strip, drawer |
| `src/game/types.ts` | additive `closeup.sceneFirst?` opt-in |
| `src/game/cases/case77.ts` | `sceneFirst: true` on Care ward's closeup |
| `src/game/content.test.ts` | 4 new cases guarding the opt-in's blast radius |
| `src/styles.css` | `.scene-zones-live`, `.scene-zone`, `.scene-beat`, `.scene-result`, `.scene-detail-*` |
| `package.json` / `package-lock.json` | `jsdom` devDependency (see "Deviations") |

- **EXECUTED** `npx vitest run` → 267 passed; tsc + eslint clean.
- **EXECUTED, live** `liveOutsideAriaHiddenFigure: true`, `liveInsideFigure: false`,
  `decorativeZoneMirrors: 0`, `sceneZoneButtons: 2`, `inspectorMethodButtons: 0`,
  `footerCta: null` — at both 1280×800 and 375×812.
- **EXECUTED, live** Rings land exactly on the authored anchors. At 1280×800 the
  measured ring centres were `(92.2, 367.1)` and `(470.6, 359.4)`; recomputing the
  cover projection by hand from the plate rect gives x = 0.23 and 0.78, y = 0.56
  and 0.54 — the authored values in `case77.ts:807`–`808`.
- **EXECUTED, live** Arm/confirm through the ring: `aria-pressed` `["true","false"]`,
  sibling zone dimmed to `0.28`, ring animation `scene-zone-arm-pulse`, one live-region
  announcement `"Let 77-A tell one memory uninterrupted — select again to file."`,
  and the pre-commit cost un-clipped only while armed.

### Step 4 (M) — ambient preview

| file | change |
|---|---|
| `src/game/cases/case77.ts` | authored `closeup.previewTreatment` (2 tokens) |
| `src/scene/SiteCloseupStage.tsx` | `data-preview-treatment` + `ScenePreviewAtmosphere` (two-layer rain, washes, vignette) |
| `src/styles.css` | `[data-preview-treatment]` absolute state-sets |

- **EXECUTED** `npx vitest run` → 267 passed; tsc + eslint clean.
- **EXECUTED, live** the table below.

### Step 5 (S) — reduced motion / high contrast / forced colours

| file | change |
|---|---|
| `src/scene/BeatStage.tsx` | ignores auto-repeat and `Unidentified` keys (see "What broke") |
| `src/styles.css` | `.reduce-motion` block + `@media (prefers-reduced-motion: reduce)` mirror, `.high-contrast`, `@media (forced-colors: active)` |

- **EXECUTED** `npx vitest run` → 271 passed; tsc + eslint clean.
- **EXECUTED, live** (both viewports): rain asset not mounted, every rain-layer
  `animationName: none`, `.site-closeup-projection` `transitionProperty: none`,
  the code-native `.site-closeup-care-trace` still present, all 7 lines rendered
  at once, the advance hint hidden, `.scene-beat-line` `animationName: none`, and
  **six seconds after the stanza rendered the result strip had still not appeared**
  — it only appeared when the explicit control was activated.

---

## Ambient computed-value table — read from the RUNNING APP

`getComputedStyle` on the live pilot plate, at 1280×800 and again at 375×812
(identical values at both). Transitions were disabled and two animation frames
allowed to pass **before** each read, per the transition-clock scar; the raw
readings are in `evidence/pilot-care-ward/pilot-evidence.json` → `ambient`.

| state | `.scene-preview-rain` opacity | rain blur | `.site-closeup-projection` filter | rain cycle | warm wash | cold wash | vignette |
|---|---|---|---|---|---|---|---|
| **rest** | `0.28` | `blur(1.1px)` | `hue-rotate(0deg) saturate(1) brightness(1) contrast(1)` | `2.4s` | `0` | `0` | `78% 74% at 50% 46%`, stop `44%`, alpha `0.55` |
| **listen** | `0.16` | `blur(2.4px)` | `hue-rotate(-12deg) saturate(1.08) brightness(1.1) contrast(0.96)` | `4.2s` | `0.85` | `0` | `82% 80% at 42% 50%`, stop `50%`, alpha `0.42` |
| **pressure** | `0.62` | `blur(0px)` | `hue-rotate(18deg) saturate(0.82) brightness(0.82) contrast(1.22)` | `1.1s` | `0` | `0.9` | `66% 62% at 62% 44%`, stop `34%`, alpha `0.86` |

Every value matches the prototype's absolute spec (`care-ward-redesign.html:26`–`47`)
digit for digit. `rainLayerName` reads `scene-preview-rain-cycle` in all three
states, and the second layer carries `animation-delay: calc(var(--preview-rain-fall) / -2)`
so a drifting layer only ever resets while faded to zero.

Preview is driven by `ChoiceButton`'s existing `onAttentionChange` → `previewActionId`
path — unchanged. **EXECUTED**: hovering with real CDP pointer events moved the
plate rest → listen → pressure → rest, and keyboard focus alone produced
`previewOnFocus: "listen"`.

---

## Event-log identity

`src/components/SceneZone.commit.test.tsx` (jsdom, real `el.click()` — synthetic
`dispatchEvent` does not reach React). For **each** authored Care ward method it:

1. renders the pre-pilot control exactly as `site-actions` does (`ChoiceButton`
   with `requiresConfirmation`), clicks twice, captures the action id;
2. renders `SceneZone`, clicks twice, captures the action id;
3. feeds each into the **real reducer** from an identical `investigation`-phase
   base state and compares the results.

**EXECUTED** result: `expect(viaScene).toEqual(viaInspector)` — whole-state
equality — plus explicit assertions on `events`, `evidence`, `trust`, `alarm`,
`methodTags`, `completedActions`, `completedSites`, `announcement`. Non-vacuity is
asserted first: the commit adds exactly one event whose `sourceType` is
`field-action` and whose `sourceId` is the action under test, so the equality is
comparing a real write, not two no-ops. A single click is asserted **not** to
commit (`aria-pressed="true"`, zero commits).

**EXECUTED, live** the ordering constraint: 120 ms after the confirming click, the
inspector already showed the filed card and the rail already read `2 events`,
while `beatMounted` was still `false`. The dispatch precedes the reveal; it is
never gated by it.

`engine.test.ts`, `content.test.ts`, `persistence.test.ts` are unchanged and pass.
The reducer, engine, and persistence files were not edited (`git diff --stat` lists
`Investigation.tsx`, `case77.ts`, `content.test.ts`, `types.ts`, `SiteCloseupStage.tsx`,
`styles.css`, plus the new files — no `engine.ts`, no `persistence.ts`, no `room.ts`).

---

## Re-entry (opacity-strand scar)

No reveal in the pilot is carried by an opacity ramp held open by
`animation-fill-mode`. Every entry is either a `clip-path`/`transform` **transition**
(no fill mode exists) or a fill-mode-less **animation whose resting style is the
visible one** — `scene-beat-line-in`, `scene-result-in`, `scene-detail-drawer-in`.
If any of them is suppressed or never runs, the element is still on screen.

**EXECUTED, live**, twice per viewport, after filing the site and returning to the
concourse each time (`10-reentry-1-*.png`, `10-reentry-2-*.png`):

| | plate opacity | plate clip-path | projection opacity | img opacity | treatment held | summon present |
|---|---|---|---|---|---|---|
| re-entry 1 | `1` | `none` | `1` | `1` | `listen` | yes |
| re-entry 2 | `1` | `none` | `1` | `1` | `listen` | yes |

Identical at 375×812.

---

## Keyboard-only transcript

**EXECUTED**, trusted CDP key events only, 1280×800. `document.activeElement` was
sampled at every step and never fell to `<body>` after the reveal opened.

| step | lands on |
|---|---|
| Tab ×1–6 | brand button → Access → the four concourse portals |
| **Tab 7** | `button.choice-row` — “Care / Let 77-A tell one memory uninterrupted / Treat the subject as a witness…” |
| (focus alone) | plate ambient reads `listen` |
| **Enter** | same button, `choice-row-armed`, `aria-pressed="true"`, **no commit, no beat** |
| **Enter** | commit fires; `button.scene-beat-advance` “Continue” takes focus |
| **Enter** | stanza flushes; the same button reads “Close the beat” |
| **Enter** | `button.scene-result-dismiss` “Close the record →” takes focus |
| **Enter** | `section.site-record.site-inspector.site-record-complete` — the filed record |

Each method is announced exactly once: the decorative mirror is suppressed
(`decorativeZoneMirrors: 0`) and the inspector list is not rendered while the
zones are live (`inspectorMethodButtons: 0`).

---

## Save / resume mid-pilot

**EXECUTED, live** (`18-resume-mid-beat-1280x800.png`, `19-resume-after-beat-1280x800.png`):

- reload **during** the beat (`beatPhase` was `playing` at the moment of reload) →
  restore → Care ward reads `data-filed="true"`, objectives read `1 / 2`, the rail
  reads `1 evidence · 2 events`, the filed card renders, and **no** beat or result
  strip is resurrected;
- reload **after** the beat → identical state, counted once, not twice.

---

## Non-pilot sites and Case 81

**EXECUTED, live**, Registry intake (`15-non-pilot-registry-1280x800.png`): three
`.cr-carrier` controls, custody console in the inspector, **2** decorative
`.site-closeup-zone` mirrors present, `.site-closeup-depth` present,
`scene-zones-live: false`, `detailSummon: false`, `previewTreatment: null`; seating
the three carriers still advanced the rail from `intake` to `late-carrier`.

**EXECUTED, live**, Case 81 (`17-case-81-1280x800.png`): opened through the title
switcher from a seeded completed-case-77 save. `title: "Case 81 · investigation"`,
`inspectorMethodButtons: 2`, `sceneFirstLayer: false`, `detailSummon: false`,
`previewTreatment: null`.

**Guarded in tests** (`content.test.ts`): the scene-first opt-in is asserted to be
authored on exactly `['case-77/care-ward']` across every registered case, on a
site with no bounded room, with one anchor per method and one distinct ambient
token per method; every other site is asserted to carry no `previewTreatment`.

---

## Screenshots — every distinct pilot screen state

`evidence/pilot-care-ward/`, each at **1280×800** and **375×812** unless noted.

| file | state |
|---|---|
| `01-rest` | plate at rest, both rings dormant, captions clipped away |
| `02-listen-hover` | LISTEN preview — warm wash, rain softened, caption open |
| `03-pressure-hover` | PRESSURE preview — cold wash, rain sharpened, vignette tight |
| `04-armed-listen` | armed ring pulsing, sibling receded, pre-commit cost shown |
| `05-beat-playing` | staged reveal mid-stanza |
| `06-beat-flushed` | full stanza after a keypress |
| `07-result-strip` | evidence + standing docked, stanza held above |
| `08-detail-drawer` | the summonable location detail |
| `09-filed` | dismissed, room held in its resolved state |
| `10-reentry-1`, `10-reentry-2` | the site re-entered twice |
| `11-reduced-motion-rest`, `12-reduced-motion-beat`, `13-reduced-motion-result` | reduced motion |
| `14-forced-colors` | forced colours (1280 only) |
| `15/16-non-pilot-registry` | Registry intake before/after seating (1280 only) |
| `17-case-81` | Case 81 investigation (1280 only) |
| `18-resume-mid-beat`, `19-resume-after-beat` | save/resume (1280 only) |

---

## What broke during the pass, and what it changed

1. **Phantom keys advanced the beat.** The keyboard transcript kept arriving at the
   result strip instantly. Instrumenting `document` showed **4014 trusted keydowns
   with `key: "Unidentified"` in 750 ms**, emitted by headless Chrome after a
   `rawKeyDown`/`keyUp` Tab pair — they hit "press any key to continue" and flushed
   plus dismissed the stanza in one stroke, and eventually wedged the renderer.
   Two changes: the harness now sends `keyDown` (phantom count `0`), and
   **`BeatStage` now ignores `event.repeat` and `key === 'Unidentified'`** — a real
   hardening, since a held key would otherwise skip the whole beat.
2. **The 375 reveal hid its own controls.** `selectSite` scrolled the inspector card
   to centre, which pushed the plate off the top of a narrow viewport — harmless
   when the methods lived in the inspector, fatal when they live in the scene. Added
   `revealSiteWorkspace`: scene-first sites centre the **stage** and focus the card
   with `preventScroll`. Non-scene-first sites keep the old behaviour exactly.
   Asserted live: `stageInFold: true` at both viewports.
3. **Two captions printed over each other.** The standing plate caption and the
   in-scene zone caption collided on a short plate; the beat's advance control
   collided with the caption row. No text assertion could see either — only the
   screenshots. The plate caption now stands down while a zone caption or the beat
   owns the plate (`.world-view--scene-quiet` / `--scene-beat`), matching the
   prototype's rest-caption behaviour.
4. **The pre-commit cost clipped at 375 exactly when armed** — the one moment it
   must be readable. A narrow caption wrapped the title to three lines and pushed
   the consequence off the plate's bottom edge. Fixed by going wide at ≤700px (only
   one caption is ever shown, so two wide captions cannot collide) and shrinking the
   ring to 44 px. Verified in `04-armed-listen-375x812.png`.
5. **Focus dropped when the stanza settled.** The beat's own control unmounts at
   `held`; focus fell to `<body>` until the player pressed Tab. The result strip's
   dismiss control now takes focus on mount.

---

## Deviations from the plan, with reasons

1. **An authored opt-in flag (`closeup.sceneFirst`) instead of "no content-schema
   flag needed initially"** (plan §5 step 3). A view-side predicate would have had
   to name `care-ward` inside `Investigation.tsx`, which the ratified
   content-id-leak review rule forbids. The flag is additive static content — no
   save impact — and the plan already anticipates additive content fields (§3).
2. **`jsdom` added as a devDependency.** The brief requires a view-level test that
   commits *through* `SceneZone`; the repo had no DOM test environment. It is pulled
   in per-file with a `// @vitest-environment jsdom` docblock, so **`vite.config.ts`
   is untouched** (as instructed) and no other test's environment changes.
3. **`SITE_CLOSEUP_ENTRY_MS` moved** from `SiteCloseupStage.tsx` to the new
   `src/scene/closeupGeometry.ts`, so the live zone layer and the decorative plate
   share ONE geometry source rather than two copies that could drift. Exporting a
   function from a component file would also have tripped `react-refresh/only-export-components`.
4. **The detail-drawer summon sits in the scene, not the inspector.** The plan says
   "one button in the scene"; it is implemented that way (`.scene-detail-summon`,
   top-right of the plate). The inspector keeps its own always-mounted description
   and filed card, so the prose is reachable in every presentation.
5. **The methods return to the inspector whenever the settled close read is not on
   screen.** Care ward can be selected while the world is showing the concourse.
   Gating the *only* method controls behind the close read would re-introduce the
   recorded `annex-investigation-inspector-always-mounted` scar, so the canonical
   list renders whenever the plate is not up. Exactly one control per method exists
   at any moment (asserted live).
6. **The prototype's hand-written `<canvas>` rain-streak layer is not ported.** It
   is not in the brief's list of absolute ambient values, and an rAF canvas is a
   real lifecycle/perf addition. The two-layer photographic rain cycle, which *is*
   in the list, is ported exactly.
7. **Under reduced motion the auxiliary rain asset does not mount at all**, rather
   than mounting statically as the prototype does. This is the project's existing
   conservative gate (`rainPresenceAssetEnabled`), which already excluded reduced
   motion, high contrast, forced colours, and travel. The static-rain CSS is in
   place as a second belt; the code-native `.site-closeup-care-trace` still gives
   the two methods distinct colour-free silhouettes (asserted live).
8. **`.site-closeup-depth` is suppressed on plates that author a
   `previewTreatment`.** The reactive vignette subsumes the static veil; stacking
   both would have darkened `pressure` (alpha 0.86) past the authored value. Only
   the pilot plate is affected — Registry intake still reports `plateDepth: true`.
9. **`scripts/evidence-pilot-care-ward.mjs` is new**, following the repo's existing
   `scripts/evidence-*.mjs` convention. It is the command that produced every
   EXECUTED claim above.

---

## UNVERIFIED / open

- **Feel.** Nothing in this document claims the pilot feels right. The user
  auditions it: `http://127.0.0.1:3000/`, concourse → **B · Care ward 12**.
- **Real devices.** Everything visual was captured in headless Chrome at
  1280×800 and 375×812. **UNVERIFIED on a real phone or a real screen reader** —
  preview ≠ device. The AT claims here are structural (one button per method in
  the accessibility tree, `role="dialog"` + `aria-modal`, one live-region
  announcement per arm, focus never reaching `<body>`), not a screen-reader run.
- **Non-Chromium browsers. UNVERIFIED.** The zone grammar leans on `:has()` for
  hover/focus/armed state and on `container-type: size` for the projection
  geometry. Both are widely supported now, but only Chrome was exercised.
- **375 framing.** At 375 the plate is a ~240 px letterbox, and the authored
  `x = 0.78` anchor lands within ~13 px of the plate's right edge, so the PRESSURE
  ring is partially cropped (`03-pressure-hover-375x812.png`). Its button box and
  tap target are fully inside the plate and the keyboard path is unaffected. This
  is the cover-crop framing the plan schedules for the full-bleed pass in **step 8**,
  not a pilot regression — the decorative mirror sat at the same anchor before.
- **Steps 6–9 of the plan are untouched**, as instructed: the rooms, the Deposition
  alignment, the `CaseRail` overlay, the App `case-layout` collapse, and flipping
  the remaining plain sites.
- `vite.config.ts` and `.claude/launch.json` were **not modified** by this work
  (they carry the pre-existing uncommitted local port pins). Nothing was committed —
  git is the reviewer's.
