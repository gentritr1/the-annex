# Rooms + deposition — steps 6 and 7 of the scene-first integration plan

Implements `docs/scene-first-integration-plan.md` §5 steps 6–7 against the live
app, extending the grammar shipped in `docs/pilot-care-ward-report.md`.

**Status of the three gates after every sub-step:** `npx vitest run` **286 passed**
(279 before this work), `npx tsc -b` clean, `npx eslint .` clean.

**Live evidence:** `node scripts/evidence-rooms-scene-first.mjs http://127.0.0.1:3000/`
(Node 24 — node 20 has no global `WebSocket`), driving the real Vite app in
headless Chrome over raw CDP → **110 checks passed / 0 failed**, 17 passes (3
rooms × {1280×800, 375×812, keyboard, reduced motion, resume} + the deposition at
both viewports). Screenshots and `rooms-evidence.json` land in
`evidence/rooms-scene-first/`. A single pass can be run in isolation with
`PASS="registry keyboard" node scripts/…`.

Every claim below is labelled **EXECUTED** (a command was run and its output
observed) or **INFERRED** (read from code, not run). No claim about how any of it
*feels* appears anywhere in this document — the audition is the user's.

---

## What the shape is now

- A **bounded room's console docks over its own plate** while the settled close
  read is on screen. It is the deposition tray's pattern: a band docked at the
  bottom of the stage, the room performing above it. Off the close read
  (concourse, mid-travel) it renders in the inspector exactly as before.
- The console is **moved, never re-rendered**: it lives at one React position and
  is portalled into a host node the workspace owns, and that host node is
  re-parented between the inspector slot and the dock. A trip back to the
  concourse mid-ritual therefore keeps the ritual.
- At the room's **terminal phase the console yields the plate** to two real
  `ChoiceButton`s at the authored `closeup.zones` anchors — the pilot's
  `SceneZone` grammar, unchanged — followed by the staged beat and the result
  strip. The room prints its unlock line and stands down.
- The **deposition** shares one staged-text family and one result-strip family
  with the scene beat. Its flow, its consent beat, and its `aria-modal` tray are
  untouched.

---

## Per-sub-step files and verification

### Step 6a (M) — the classification room (The Small Archive)

| file | change |
|---|---|
| `src/scene/closeupGeometry.ts` | new `derivedStageFocus()`; `closeupFocusPoint()` takes it — ONE focus derivation for the plate and the live zone layer |
| `src/scene/SiteCloseupStage.tsx` | uses those two helpers instead of its own copy (pure extraction; stagecraft untouched) |
| `src/components/ClassificationRoom.tsx` | `methodsInScene` prop: prints a stand-in line instead of its `ChoiceButton`s, and does not request an in-room focus landing at unlock |
| `src/components/Investigation.tsx` | the console host + dock/slot relocation, the extended scene-first predicate, the unlock focus handoff, the dock-aware ritual CTA |
| `src/game/cases/case77.ts` | `sceneFirst: true` on the small-archive closeup |
| `src/components/SceneZone.tsx` | `data-vertical="low"` for anchors at y ≥ 0.60 |
| `src/styles.css` | `.room-console` + docked tableau layouts, the low-anchor caption, `.room-*-in-scene` |
| `src/game/content.test.ts` | the opt-in blast-radius guard rewritten for room sites |
| `src/components/SceneZone.commit.test.tsx` | the event-log identity test generalized to every scene-first site |

### Step 6b (M) — the acoustic-shadow room (Maintenance spine)

| file | change |
|---|---|
| `src/components/AcousticShadowRoom.tsx` | `methodsInScene` prop (stand-in line; the last crossing does not request an in-room landing — **the `CHOOSE_BAND` dispatch still always runs**) |
| `src/game/cases/case77.ts` | `sceneFirst: true` on the maintenance closeup |
| `src/components/Investigation.tsx` | passes `methodsInScene` |
| `src/styles.css` | the crossing's docked layout; `.room-console` max-height raised to 76% (the tallest tableau) |
| `src/game/content.test.ts` | expectation extended |

### Step 6c (M) — the custody rail (Registry intake)

| file | change |
|---|---|
| `src/components/CustodyRailRoom.tsx` | `methodsInScene` prop |
| `src/game/cases/case77.ts` | `sceneFirst: true` on the registry closeup |
| `src/components/Investigation.tsx` | passes `methodsInScene` |
| `src/styles.css` | the intake / mirror / reading docked layouts |
| `src/game/content.test.ts` | expectation extended |

### Step 7 (M) — deposition alignment

| file | change |
|---|---|
| `src/styles.css` | ONE staged-text family (`.scene-beat-line--subject` + `.deposition-statement`), ONE attribution family (`.scene-beat-line--speaker` + `.deposition-visual-caption span`), ONE result-strip family (`.scene-result` + `.deposition-result`) — the duplicated declarations deleted from each side |
| `src/components/Deposition.tsx` | the closing beat's consent summary + commit control wrapped in `.deposition-result` (no flow, beat, or modal change) |

---

## The always-mounted rule, asserted live

**EXECUTED**, per room, at 1280×800 and 375×812. `roomInstances` counts the room
root in the whole document; `anyChoiceRows` counts every method control anywhere.

| moment | console lives in | room instances | ritual controls | method controls |
|---|---|---|---|---|
| settled close read, mid-ritual | the dock over the plate | 1 | one set | 0 |
| concourse / mid-travel | the inspector | 1 | one set | 0 |
| terminal phase, settled plate | the inspector (stood down) | 1 | 0 | **2**, both in the scene |
| terminal phase, off the close read | the inspector | 1 | 0 | **2**, both in the inspector |

`consoleWithinPlate` is asserted from the measured rects: the dock's box sits
inside the plate's box on every viewport.

---

## The ritual survives the move (the load-bearing claim)

The console changes container, so if it were re-rendered the whole ritual would
silently reset. **EXECUTED, live**, per room: run part of the ritual, return to
the concourse, re-enter.

| room | progress before | progress after |
|---|---|---|
| The Small Archive | `routine` (one card filed) | `routine` |
| Maintenance spine | `pulse 2 / 3` | `pulse 2 / 3` |
| Registry intake | `1 / 3 seated` | `1 / 3 seated` |

---

## Event-log identity

`src/components/SceneZone.commit.test.tsx` now iterates **every** scene-first
site's anchors — eight cases: care ward, registry, maintenance, small archive.
For each it renders the pre-pilot control (`ChoiceButton` with
`requiresConfirmation`), clicks twice, then renders `SceneZone`, clicks twice,
and feeds both captured actions to the **real reducer** from an identical
investigation-phase base state.

**EXECUTED** result: `expect(viaScene).toEqual(viaInspector)` — whole-state
equality — plus explicit assertions on `events`, `evidence`, `trust`, `alarm`,
`methodTags`, `completedActions`, `completedSites`, `announcement`, and a
non-vacuity guard that the commit wrote exactly one `field-action` event for the
action under test. Real `el.click()`; synthetic `dispatchEvent` does not reach
React.

**EXECUTED, live**, per room: 120 ms after the confirming click the inspector
already showed the filed card while `beatMounted` was still `false`. The dispatch
precedes the reveal and is never gated by it.

`engine.ts`, `persistence.ts`, `room.ts`, `custodyRail.ts`, and
`acousticShadow.ts` were **not edited** (`git diff --stat` lists no file under
`src/game/` but `cases/case77.ts`, `content.test.ts`).

---

## Ambient preview

No new atmosphere art was authored, and **no `closeup.previewTreatment` was added
to any room site** — see Deviation 3. Each room's hovered/focused terminal zone
drives the vocabulary that site already authors, through the unchanged
`ChoiceButton.onAttentionChange → previewActionId` path:

- **Registry intake** — `custodyRail.actionTreatments` (`chain` / `return`).
  **EXECUTED, live**: hovering the two rings moved
  `.site-closeup-custody-outcome[data-variant]` `chain` → `return`.
- **Maintenance spine / The Small Archive** — no per-action ambient token exists
  in their authored content, so their zones drive only the shared emphasis camera
  (`data-emphasis`), exactly as their decorative mirrors did before.

**EXECUTED, live**: `.scene-zones-live-projection` and `.site-closeup-projection`
share a box to within 0 px on every room and viewport (`dx/dy/dw/dh = 0`), which
is the check that the one extracted focus derivation actually binds both layers.

---

## Keyboard-only, per room, end to end

**EXECUTED**, trusted CDP key events only (`keyDown`, never `rawKeyDown` — the
recorded phantom-`Unidentified` scar), 1280×800, sampling `document.activeElement`
at every step.

| step | lands on |
|---|---|
| Tab ×13 | the first control **inside the docked console** |
| Enter … | the ritual, control by control, focus never falling to `<body>` |
| (unlock) | a `.scene-zone` `.choice-row` — the workspace hands the route to the plate |
| **Enter** | `aria-pressed="true"`, no commit |
| **Enter** | commit fires; the beat's advance control takes focus |
| **Enter** ×n | the stanza flushes and settles |
| Tab → **Enter** | `.scene-result-dismiss` → the filed inspector record |

The acoustic room deliberately keeps focus on its Listen control while the pulse
advances, so the transcript Tabs to the masked band as a player would; the other
two rooms' own focus chains carry the whole ritual without a single Tab.

---

## Reduced motion

**EXECUTED, live**, per room: the docked console's `animationName` is `none` and
its computed opacity is `1` (probed with transitions killed and two frames
allowed to pass — the transition-clock scar). The staged beat renders every line
at once, shows no advance hint, and **five seconds after the stanza rendered the
result strip had still not appeared** — it appeared only when the explicit
control was activated. Advance-paced, never auto-timed.

---

## Re-entry ×2 and save/resume

**EXECUTED, live**, per room and viewport, after filing and returning to the
concourse twice: plate opacity `1`, plate clip-path `none`, projection opacity
`1`, image opacity `1`. No reveal added here is carried by an opacity ramp held
open by `animation-fill-mode`: `room-console-in` and `scene-result-in` are
transform-only with no fill mode, so a suppressed animation leaves the element at
its visible resting style.

**EXECUTED, live**, per room: a reload **mid-ritual** returns to a run with `0 / 2`
sites and **zero** filed records — the ritual is view-local and writes nothing,
which is exactly what it did before this work.

---

## Case 81 and the deposition

**EXECUTED, live**, at 1280×800 and 375×812, from a seeded completed-case-77 save
(schema-2 recipe from `scripts/evidence-travel.mjs`, with `phase: 'debrief'` and
its verdict recorded — `persistence.ts:365` rejects a debrief save with a null
decision, and the title switcher takes a confirmation step for a run that has not
reached its debrief):

- `title: "Case 81 · investigation"`, `sceneFirstLayer: false`,
  `roomConsole: false`, `inspectorChoiceRows: 2` — Case 81 is untouched by the
  rooms work.
- The transcript tray opens with `aria-modal="true"` and focus inside it.
- The sworn statement now computes to the **shared staged-text family**:
  `font-size 16px`, `font-weight 300`, `line-height 23.2px`,
  `color oklch(0.94 0.012 190)` — the scene beat's voice, read from the running
  app with transitions disabled first.
- The closing beat's commit is a `.deposition-result` strip carrying the consent
  summary and the two-step commit control.
- Committing files the site: tray gone, filed record present, objectives `1 / 2`,
  focus not on `<body>`.

---

## Pilot regression

**EXECUTED**: `node scripts/evidence-pilot-care-ward.mjs http://127.0.0.1:3000/ <seed>`
re-run unmodified against this work → **53 passed / 0 failed**. The pilot's own
surfaces (one control per method, ring anchoring on the authored anchors,
arm/commit, the ambient state-set table, reduced motion, forced colours, the
keyboard transcript, save/resume, and Registry intake's pre-terminal presentation)
all still hold after the shared-code changes: the extracted focus derivation, the
zone pointer surface, the low-anchor caption, and the shared staged-text family.

---

## Screenshots — every distinct room state

`evidence/rooms-scene-first/`, 86 files. Each room prefix is `small-archive-`,
`maintenance-`, or `registry-`; each name below exists at **1280×800** and
**375×812** unless noted.

| file | state |
|---|---|
| `01-console-docked` | the ritual's console docked over the plate |
| `02-console-in-inspector` | the same ritual, mid-work, back in the inspector at the concourse |
| `03-terminal-zones` | the console stood down, the two methods on the plate |
| `04-zone-preview-a`, `05-zone-preview-b` | each method previewed through its ring |
| `06-armed` | armed ring, sibling receded, pre-commit cost un-clipped |
| `07-beat` | the staged reveal over the settled room |
| `08-result-strip` | evidence + standing docked under the stanza |
| `09-filed` | dismissed, the room held in its resolved state |
| `10-reentry-1`, `10-reentry-2` | the site re-entered twice after filing |
| `11-keyboard-unlocked` | 1280 only — the ritual completed with keys alone |
| `12-reduced-motion-console`, `13-reduced-motion-beat` | 1280 only |
| `14-resume-mid-ritual` | 1280 only — reload mid-ritual, nothing written |
| `deposition-01-tray` … `04-committed` | Case 81: tray, consent beat, the commit strip, the filed record |

---

## What broke during the pass, and what it changed

1. **Two zones' hit areas overlapped, and the wrong method armed.** At 375×812
   the maintenance anchors sit close enough that each zone's caption box covered
   the *other* zone's ring; the later zone in DOM order won the hit test, so a
   click on one ring's centre armed the other method. Caught by the live arm
   assertion (`ariaPressed: ["false","true"]` after clicking ring 0). Fixed by
   making the caption box pointer-transparent and re-enabling a ring-sized region
   on the button (`.scene-zone .choice-row::before`, 62 px desktop / 44 px
   narrow): a zone's pointer surface is now exactly the mark it draws. Keyboard
   is unaffected, and hovering the region still matches `.choice-row:hover`
   because a pseudo-element's hits belong to its element. **This was a live bug
   in the shipped pilot grammar too** — care ward's boxes overlap by ~47 px at
   375 — that the pilot's own evidence could not see, because it only ever
   clicked ring centres far from the overlap.
2. **A low anchor's caption ran off the plate.** The small archive's
   `answer-archivist` anchor is at y = 0.70; the caption grows downward from the
   ring, so on a letterboxed plate the pre-commit cost was cut off exactly when
   the player armed. Zones at y ≥ 0.60 now caption upward
   (`data-vertical="low"`). Every pilot anchor is above 0.60, so care ward is
   untouched.
3. **The docked console ate the plate.** The rooms' tableaus are authored as
   fixed-height 384 px columns for the inspector; docked over a ~390 px plate
   that left an 86 px sliver of photograph and an inner scrollbar hiding the
   third statute class. Each docked tableau now lays out **across** the plate's
   width instead of down it (same controls, same DOM order, nothing hidden), and
   the console is capped at 76%. Measured docked heights at 1280×800: small
   archive 215 px, registry 206 px, maintenance 290 px.
4. **The acoustic room's last crossing nearly lost its dispatch.** The first
   version of the `methodsInScene` guard returned early from `chooseBand`, which
   would have skipped `dispatch({ type: 'CHOOSE_BAND' })` entirely. Restructured
   so the dispatch always runs and only the focus request is conditional.
5. **Two captions printed over each other at 375.** The unlock hands focus to
   zone 0; the player then hovers zone 1 — and both captions opened, because
   focus and hover each reveal one. On a 375 plate they overlapped into
   `“Walk the acou**Forge maint**enance authority”`. Caught only by the
   screenshot, so the harness now asserts the computed clip-path of every caption
   and requires **exactly one open**. Fixed with a precedence rule: armed beats
   hover beats focus, so one caption is open at any moment. **Latent in the
   shipped pilot too** — care ward's caption boxes overlap at 375 the same way.
6. **The ritual CTA pointed at the wrong surface.** `fieldCta`'s `ritual-step`
   action scrolls to and focuses the inspector; with the console docked, the
   control it names is on the plate. It now follows the console into the dock.

---

## Deviations from the plan and the brief, with reasons

1. **The console is not focus-trapped.** The brief says "focus management per
   `SceneDetailDrawer` conventions"; `SceneDetailDrawer` is an `aria-modal`
   dialog that traps Tab. A room console must not: the concourse return, the site
   switcher, and the case rail all have to stay reachable during a ritual, and
   trapping them away would re-create the very "gated behind entering a view"
   problem the always-mounted scar records. What is taken from that component is
   the part that applies — deliberate focus custody: focus is carried across the
   dock/undock re-parent explicitly, and the unlock hands the route to the first
   plate zone.
2. **The scene-first predicate includes a filed site** (`roomMethodsRevealed ||
   selectedCompletedAction`) rather than the terminal phase alone. A filed room
   site whose view-local room state was reset by a location switch would
   otherwise flip back to the pre-scene-first presentation depending on
   navigation history. The visible consequence is that a filed room plate no
   longer prints its two decorative zone labels (the ✓ mirror) — the same
   trade the pilot already ships on care ward.
3. **No `closeup.previewTreatment` was authored on any room site.** The brief
   scopes ambient preview to "where the site already has state treatments to
   drive" and forbids inventing atmosphere art. The authored
   `PREVIEW_TREATMENTS` vocabulary is `listen | pressure`, and every absolute
   value bound to those tokens in `styles.css` is Care Ward's rain atmosphere
   (rain matte, warm/cold wash, its vignette geometry) — authoring it elsewhere
   would put Care Ward's weather on a corridor and an archive. Registry's own
   `chain`/`return` treatments already preview from `previewActionId` and are
   asserted doing so through the scene zones; maintenance and the small archive
   author no per-action ambient token, and inventing one would have meant either
   new art or inferring a visual state from `grantsTribunalOverride`, which
   `types.ts` explicitly forbids.
4. **`derivedStageFocus` was extracted from `SiteCloseupStage` into
   `closeupGeometry.ts`.** The live zone layer has to use the identical focus
   point and emphasis flag as the plate or the rings drift under the 1.026
   action-focus camera. Duplicating the derivation would have been a drift
   waiting to happen; this is a pure move, asserted live at 0 px divergence.
5. **The rooms' `methodsInScene` stand-in lines are new UI strings** in three
   components, not authored case content. They are presentation chrome in the
   register of the pilot's existing `.scene-first-note`, and they name no case,
   location, or method id.
6. **The pointer-surface fix (What broke #1) changes the shipped pilot's hover
   and click surface**, not only the new rooms'. It is the same class of fix the
   pilot's Deviation 5 records — one control per method, and now one *region* per
   control — and re-verifying care ward was folded into this pass.
7. **`scripts/evidence-rooms-scene-first.mjs` is new**, following the repo's
   `scripts/evidence-*.mjs` convention. It is the command that produced every
   EXECUTED claim above.

---

## UNVERIFIED / open

- **Feel.** Nothing here claims any of it feels right, and the docked console's
  proportions in particular are a taste call: at 1280×800 the pre-step-8
  workspace gives the plate ~390 px, so the acoustic console leaves ~97 px of
  photograph above it. The plan schedules the scene-dominant layout for **step
  8**; until then this is the honest ceiling. Audition:
  `http://127.0.0.1:3000/` → concourse → **A · Registry intake**, **C ·
  Maintenance spine**, **D · The Small Archive**.
- **Real devices and real assistive tech. UNVERIFIED** — everything visual was
  captured in headless Chrome at 1280×800 and 375×812. The AT claims here are
  structural (one control per method in the tree, one live region per room, focus
  never reaching `<body>`), not a screen-reader run.
- **The zone hit region's size is declared, not measured.** `62 × 62` desktop and
  `44 × 44` narrow are absolute authored values in `styles.css`; the live harness
  asserts that clicking a ring's centre arms *that* zone, not the region's
  computed box. INFERRED from reading, not EXECUTED.
- **High contrast and forced colours for the docked console. UNVERIFIED.** The
  rules are in place (`.high-contrast .room-console`, the `forced-colors` block,
  and the shared strip family's entries in both), but the rooms harness exercises
  reduced motion only; the pilot's forced-colours pass covers care ward, not a
  docked console.
- **Non-Chromium browsers. UNVERIFIED.** The zone grammar leans on `:has()`, on
  `container-type: size`, and now on a `pointer-events: none` parent with an
  `auto` pseudo-element. All are widely supported; only Chrome was exercised.
- **Case 81's own sites are unchanged and were not migrated** — they author no
  `closeup.sceneFirst`, asserted in `content.test.ts`.
- **Plan steps 8 and 9 are untouched**, as instructed: no `CaseRail` overlay, no
  `case-layout` collapse, no People tab, no rail collapse.
- `vite.config.ts` and `.claude/launch.json` were **not touched** by this work.
- **Nothing was committed — git is the reviewer's.** Note that HEAD moved during
  this session (it was `c5bb083` at the start and is `ba15c04` now, with the
  pilot's evidence PNGs and the local port pins now tracked). One consequence:
  `evidence/pilot-care-ward/*.png` show as modified, because the pilot regression
  re-run above rewrote them from the current build. They are the same states the
  pilot report describes, re-captured.
