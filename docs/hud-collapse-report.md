# HUD collapse report — persona plan steps E, F, G (= scene-first plan step 8)

What shipped: the roster dossier as a fourth tab on the case-file surface; the
case rail collapsed out of the App layout and behind a summon; the always-on set
reduced to the ratified list with the civic alarm promoted; and an evidence
harness that proves it.

Every claim below is tagged **EXECUTED** (a command was run and its output
observed) or **INFERRED** (read from source, not run). Anything that could only
be settled by a person or a device is under **UNVERIFIED / open** at the foot.

Command that produced every EXECUTED runtime claim:

```
~/.nvm/versions/node/v24.18.0/bin/node scripts/evidence-hud-collapse.mjs
→ 123/123 checks passed · 34 screenshots · evidence/hud-collapse/
```

Gates, all green after the final edit — **EXECUTED**:

```
npx tsc -b        → clean
npx eslint .      → clean
npx vitest run    → 16 files, 294 tests passed  (286 before + 8 new)
npm run build     → clean
```

---

## Step E — the People tab (rail still a column at the time it landed)

| file | change |
|---|---|
| `src/game/personaRecord.ts` | **new.** `personaRunLines(state, personaId)` — a pure persona-major transpose of the event log: `state.events` sorted by `event.order`, each resolved through the existing `getReactionsForSource(caseId, sourceType, sourceId, precedents)`, keeping only that persona's lines as `{order, cite, line}`. No reducer, no persisted field, no content change. |
| `src/game/personaRecord.test.ts` | **new.** 8 cases, in the `fieldCta`/`beats` discipline. |
| `src/components/CaseRail.tsx` | `RailTab` union gains `'people'`; the tab bar maps a `RAIL_TABS` constant so the existing `aria-pressed` / `aria-controls` / `id` wiring is unchanged; new `#rail-panel-people`. |
| `src/styles.css` | `.rail-tabs` grid `repeat(3,1fr)` → `repeat(4,1fr)`; new `.persona-dossier*` family. |

**The dossier card, as implemented:** sheet portrait (120px — the one surface
that exposes the portrait's authored `alt`), name (`<h3>`), role, current stance
word (+ number when `settings.showTrustNumbers`, the same expression
`CaseRail` already used for the rail row), the authored principle, then
**"On the record this run"** — the `personaRunLines` list, each line followed by
its event title as a citation in mono `--fog-dim`. Empty state is exactly
`Nothing said on the record yet.`

**Zero animation on the dossier — EXECUTED.** The harness walks every node in
`#rail-panel-people` and asserts `getComputedStyle(el).animationName === 'none'`
for all of them (`animatedNodes: 0`). The surface is summoned, so the change it
reports has already happened; animating on open would be a lie about when.

**Class-collision scar, caught during implementation — INFERRED then fixed.**
The stance word was first written as `className={\`persona-dossier-stance trust-${label}\`}`.
`.trust-committed` / `.trust-open` / `.trust-guarded` / `.trust-opposed` are the
persona **signal dot's fill** (`background: var(--cyan)`, `styles.css`) — that
would have painted a coloured block behind the word, and **no text assertion
could have seen it.** It ships as `data-stance={label}` with its own text-colour
rules. Every other new class name (`persona-dossier`, `-card`, `-head`, `-role`,
`-stance`, `-principle`, `-said`, `-lines`, `-line`, `-cite`, `-empty`,
`people-panel`, `casefile-portal`, `-drawer`, `-header`, `-close`,
`casefile-summon`, `scene-summons`, `field-alarm`) was grepped against
`src/styles.css` and all `src/**/*.tsx` before use: 0 pre-existing occurrences —
**EXECUTED** (`grep -ro <name> src/`).

---

## Step F — the HUD collapse

| file | change |
|---|---|
| `src/components/CaseFileDrawer.tsx` | **new.** `CaseFileDrawer` (portal + focus trap + Escape + focus-return, `SceneDetailDrawer`'s conventions) hosting `CaseRail`; `CaseFileSummon` (the summon, with the live counts as its preview) exported from the same file so there is exactly one definition. |
| `src/App.tsx` | `CaseRail` removed from `case-layout`; owns `caseFileOpen`; renders the drawer; renders the shell summon on every **non-investigation** phase; retires the open file on a phase change (derived during render, not in an effect). |
| `src/components/Investigation.tsx` | always-on set reduced (below); `.scene-summons` row with the Case-file + Location-detail summons; mutual exclusivity; the filed-model block removed from the dock. |
| `src/components/CaseRail.tsx` | mobile toggle + `mobileOpen` retired; `<aside aria-label="Case file">` → `<div>`; the filed-model `<details>` moved in, into the Case tab. |
| `src/styles.css` | `case-layout` single column; `.case-rail` re-homed inside the drawer; the drawer/summon families; workspace-height retune; narrow full-bleed plate; the ≤1180 rail-bar block and the 1121–1180 height exception deleted. |

### The always-on verdict table, as implemented

| element | plan verdict | as shipped | evidence (all **EXECUTED**) |
|---|---|---|---|
| Site label (`world-caption`) | KEEP | kept, unchanged | `worldCaption` non-empty at both viewports |
| Objectives counter | KEEP | kept, and now leads the strip (its stray `border-left` dropped with the cell it used to divide) | `objectives: 1`; reads `1 / 2 sites` after the first filing |
| Threshold line | KEEP until first site filed, then retire | `{state.completedSites.length === 0 && …}` | present before (`threshold: 1`), absent after a real Care-ward filing (`threshold: 0`, `filed: 1`) |
| **Civic alarm** | **PROMOTED**, only when nonzero, coral `text-risk` | a third cell in the objectives strip, `.field-alarm`; **absent at 0**, `"1 trace"` / `"3 traces"` + `civic alarm` at 1 / 3, value in `oklch(0.66 0.17 30)` via `.text-risk` | seeded saves at alarm 0/1/3; `07-alarm-{0,1,3}` |
| `fieldCta` dock | KEEP, logic untouched | container only; `fieldCta.ts` not edited | `ctaDock: 1`; `fieldCta.test.ts` unchanged and green |
| `<h1>` + `field-command-copy` | DROP from view, `<h1>` stays sr-only | `<h1 className="sr-only" id="field-heading">`; copy deleted | `h1Class: "sr-only"`, box `1×1`; `commandCopy: 0` |
| Field→Memory→Tribunal breadcrumb | DROP | deleted | `breadcrumbs: 0` |
| `filed-model` block | MOVE into the case file's Case tab | moved verbatim (same `<details>`, same `ReactionQuotes`); the dock keeps a one-line "… · model filed" | `filedModelInDock: 0` |
| Rail case / evidence / log / people | MOVE behind the summon | the drawer is the rail's only home, at every width | `railsInShell: 0`, `railMobileToggles: 0` at 1280 **and** 375 |

### Mutual exclusivity — EXECUTED, live

Enforced twice: `openCaseFile()` / `openDetailDrawer()` each close the other, and
the location-detail drawer additionally renders under `detailDrawerOpen && !caseFileOpen`.
Asserted with `document.querySelectorAll('[aria-modal="true"]').length`:

| state | count | which |
|---|---|---|
| at rest | 0 | — |
| location detail open | 1 | `scene-detail-drawer` |
| case file open | 1 | `casefile-drawer` |
| **detail summon clicked while the case file is open** | **1** | `scene-detail-drawer` |
| after Escape | 0 | — |

### Keyboard-only transcripts — EXECUTED, trusted CDP key events

`document.activeElement` sampled at every step; it never reached `<body>` after
the dialog opened, in any of the three transcripts.

**Case file · 1280×800** (identical at 375×812)

| step | lands on |
|---|---|
| focus the summon | `button.casefile-summon` "Case file 0 evidence · 1 events" |
| **Enter** | `div.casefile-drawer` (the dialog itself) |
| Tab ×1–5 | Close ✕ → case → Evidence 0 → log → people |
| Tab ×6–7 | **wraps** back to Close ✕ → case |
| Shift+Tab ×3 | stays inside |
| **Escape** | dialog closed; focus back on `button.casefile-summon` |

**Location detail · 1280×800**

| step | lands on |
|---|---|
| focus the summon | `button.scene-detail-summon` |
| **Enter** | `div.scene-detail-drawer` |
| Tab ×1–3 | Close ✕ (its only focusable), no escape |
| **Escape** | closed; focus back on `button.scene-detail-summon` |

The trap's focusable selector is deliberately **wider** than
`SceneDetailDrawer`'s: it includes `summary`, because the rail's evidence entries
and the filed-model block are `<details>` whose `<summary>` is natively tabbable.
With the narrower selector, Tab from the last summary would have walked out of
the dialog — **INFERRED from reading the DOM the rail emits**, then closed by
construction and covered by the cycle assertion above.

### Cross-zone sweep (the new rule) — EXECUTED

Three surfaces now carry ≥2 positioned interactive controls.

1. **The plate chrome** — `.world-return` (top-left), `.casefile-summon` and
   `.scene-detail-summon` (one flex row, top-right). For each: click its visual
   centre through `document.elementFromPoint` and assert that point belongs to
   *that* control; then drive each for real and assert the intended surface
   opened and the other did not. Plus a pairwise box-intersection test.
   - 1280×800: 0 overlaps; each centre hits its own control.
   - 375×812: **this is where it caught a real bug.** The return button is 157px
     and the two summons are 265px — 432px of controls in a 375px row. The
     summons were sliding under the return. Fixed with a second chrome row below
     460px (`@media (max-width: 460px) { .scene-summons { top: 62px } }`);
     re-measured, 0 overlaps.
2. **The drawer's four-tab bar** — each tab's centre hits that tab; clicking each
   opens exactly one panel and presses exactly one tab (`panels: 1`, `pressed: 1`).
3. **The shell summon over four scrolling document surfaces** (briefing,
   reconstruction, tribunal, debrief) — every interactive element swept at three
   scroll positions; `occluded: []` everywhere, and the summon hits itself.

### Console proportions — before/after, EXECUTED at 1280×800

"Before" was measured live against the pre-change build in the running dev
server; "after" from the harness, both with transitions and animations disabled.

| | plate | Registry intake | Maintenance spine | The Small Archive |
|---|---|---|---|---|
| **before** | 516 × 387 | console 206 → **181px of scene above** | console 291 → **97px** | console 220 → **168px** |
| **after** | **792 × 464** | console 191 → **273px** (+92) | console 250 → **214px** (+117) | console 220 → **244px** (+76) |

The rooms round's open flag was the acoustic crossing at 97px. It is now 214px,
on a plate 276px wider.

**The `max-height: 76%` cap was deliberately NOT changed, and that is the
finding.** After the collapse the three tableaux lay out at natural heights of
190 / 249 / 219px against a cap of 353px — the cap is no longer the binding
constraint at this viewport, and none of the three scrolls (`scrolls: false` for
all three, **EXECUTED**). Lowering the number would have changed nothing at
1280×800 and would only have taken effect at viewport heights this pass did not
measure — a number in a spec that was never computed from live data is the exact
red flag the harness forbids. The scene gained its room from the layout, not from
the cap.

### The 375 pass — EXECUTED

The pilot's standing flag was the `x = 0.78` pressure ring cropped at the plate's
right edge. Re-measured on the pre-change build it was **+8px over on the right
and +2px over on the left**.

The plate's cover projection is `width: max(100cqw, 100cqh * 16 / 9)`, so below
~570px of plate width the projection width is set by the plate's **height**, and
both authored anchors ride outboard. Two absolute changes, both derived rather
than guessed:

1. **Full-bleed plate** (`.world-pane { margin-inline: -14px }` at ≤840px, with
   the switcher putting its own padding back). 347px → **375px**, moving each
   anchor 14px inboard.
2. **Plate height 320 → 300px at ≤600px.** Solving the worst case — the 1.026
   action-focus camera pushing the far ring outward while the near one is
   armed — gives `209.5 + 0.2943 × (height × 16/9) ≤ 375` → projection ≤ 562px →
   **height ≤ 316px**. 300 is that ceiling with room to spare. Applied only where
   the projection actually outruns the plate; at 600px wide the projection is
   533px and nothing above that width loses any scene.

Measured result (negative = clearance inside the plate):

| state | listen ring (x=0.23) | pressure ring (x=0.78) |
|---|---|---|
| before, 347px plate | **+2px cropped** left | **+8px cropped** right |
| after, at rest | −21px | −16px |
| after, listen armed (worst case) | −19px | **−8px** |
| after, pressure armed | −13px | −14px |

Tap targets stay 44×44. The plate is asserted full-bleed (`375 === innerWidth`).
The case file becomes a full-height sheet at 375 (`375 × 812`), a right-docked
520px drawer at 1280 (`left 760, right 1280`).

### Workspace budget

At 1280×800 the collapsed chrome measures 146px above the workspace and 104px
below it, so `.field-workspace` height went `max(500px, calc(100svh - 260px))` →
`- 254px`. The old value overflowed the viewport by 29px; the page now fits
exactly (`scrollHeight 800 === innerHeight 800`, **EXECUTED**). The ≤1120 rule
went `- 362px` → `- 268px` and the 1121–1180 exception was deleted — the extra
~100px both subtracted paid for the rail's 54px sticky mobile bar, which no
longer exists.

---

## Step G — the evidence pass

`scripts/evidence-hud-collapse.mjs` (**new**, following the repo's
`scripts/evidence-*.mjs` convention) → `evidence/hud-collapse/`:
**123 checks, 34 screenshots at 1280×800 and 375×812, `measurements.json`.**

Disciplines it observes: `el.click()` or trusted CDP input only, never
`dispatchEvent`; every computed read taken with transitions **and** animations
disabled plus two frames; the dev server on port 3000 is reused and never killed.

Two harness bugs were found and fixed inside this pass, both worth recording:

- **The freeze strands entry animations.** `animation: none !important` leaves an
  element at its base frame, which produced a mid-transition screenshot of the
  docked console — the harness's own version of the recorded opacity-strand scar.
  `shot()` now settles 460ms after the freeze is lifted before capturing.
- **A wedged renderer is an instrument failure, not a finding.** A long run
  mounts the WebGL concourse ~30 times; twice a mid-run cluster of
  `CDP timeout: Page.navigate / Emulation.*` appeared. `bootFreshRun` now
  navigates to `about:blank` between documents to drop the context, and `guard`
  retries a CDP timeout once. Two consecutive clean 123/123 runs since.

### `dist` byte delta — EXECUTED, true before/after

Both builds run with `npm run build` on the same tree; the "before" build was
produced with `git stash push -- src/` and the stash restored immediately after.

| asset | before | after | Δ |
|---|---|---|---|
| `index-*.css` | 169.79 kB (gzip 30.96) | 172.65 kB (gzip 31.29) | **+2.86 kB** (gzip +0.33) |
| `index-*.js` | 456.71 kB (gzip 136.57) | 460.17 kB (gzip 137.44) | **+3.46 kB** (gzip +0.87) |
| `createAnnexWorld-*.js` | 533.05 kB | 533.05 kB | 0 |
| `dist/` total (`du -k`) | 4004 KB | 4012 KB | **+8 KB** |

No new asset, no new runtime dependency, no PNG master anywhere near `dist/`.

---

## Regression gate — all three existing harnesses re-run, EXECUTED

| harness | result |
|---|---|
| `scripts/evidence-rooms-scene-first.mjs` | **110 passed / 0 failed** — no edit needed |
| `scripts/evidence-pilot-care-ward.mjs` | **52 passed / 1 failed** — no edit needed |
| `scripts/evidence-persona-portraits.mjs` | **37 passed / 0 failed** — one edit, below |

The pilot's single failure is `[1280x800 case-81] case 81 live flow`, whose own
detail reads `skipped: no seed save supplied; case 81 is gated behind a completed
case-77 verdict`. It is a pre-existing skip that fires whenever `SEED_SAVE_PATH`
is unset and is unrelated to this work — **INFERRED** from reading
`evidence-pilot-care-ward.mjs:910`–`914`, not from a pre-change run of that one
check.

### Harness edits — one, listed with its justification

**`scripts/evidence-persona-portraits.mjs`** — the rail's Social-memory block is
one of the surfaces it measures, and after the collapse that surface is inside
the summoned drawer rather than an always-on column (or, narrow, a sticky bar
behind a mobile toggle). **No check was deleted or weakened.** The three
identical route preludes

```js
if (!(await evaluate(`(document.querySelector('.persona-list')?.…height ?? 0) > 0`))) {
  await click('.rail-mobile-toggle'); await sleep(500)
}
await click('.rail-tabs button', 'case')
```

were replaced by one `openCaseFileCaseTab()` helper that clicks
`.casefile-summon`, waits for `.casefile-drawer`, then clicks `#rail-tab-case` —
i.e. the surface is now reached the way a player reaches it. The five checks that
failed purely for want of a route (row height unchanged by the 20→40px cell, four
roles legible, portraits matted/decorative/decoded, AT name counts, sigil
fallback + breathe) all pass again, at both viewports and under forced colours,
against the identical assertions.

---

## Deviations from the brief, with reasons

1. **The civic alarm chip lives in the field chrome strip beside the objectives,
   not on the plate.** The brief says "promoted to scene chrome"; §3.4 caps the
   plate at three controls, and the alarm is not a control. On the plate it would
   compete with a docked room console (which can occupy the bottom 76%), a staged
   beat, and the result strip; in the always-on strip it is visible in every
   investigation presentation — concourse, travel, close read, mid-ritual. It
   reuses the objectives' existing cell grammar and the `text-risk` coral. This
   is the one place the restructure adds density, as ratified.
2. **A second mount point for the summon: the shell, on non-investigation
   phases.** The rail used to render on briefing, reconstruction, tribunal and
   debrief too. Removing the column without a summon there would have made the
   case file unreachable on four surfaces. `CaseFileSummon` has ONE definition
   (exported from `CaseFileDrawer.tsx`) and exactly one mount is live at a time —
   the plate during investigation, `.casefile-summon--shell` otherwise. Its
   occlusion risk over a scrolling document is swept and clean on all four.
3. **`CaseRail`'s root `<aside aria-label="Case file">` became a plain `<div>`.**
   Inside a dialog already labelled "Case file", it was a second complementary
   landmark with the same name. The component is otherwise internally intact.
4. **The drawer's focus-trap selector is wider than `SceneDetailDrawer`'s**
   (adds `summary`, links and form controls) because the rail contains
   `<details>`. See the keyboard section.
5. **`.room-console { max-height: 76% }` was left alone.** See the console
   section — it is no longer the binding constraint, and re-picking the number
   without live data for the viewports it would affect is the "threshold never
   computed from live data" red flag.
6. **The workspace-height retune touched three rules, two of which were
   deleted** (the ≤1180 rail-bar block and the 1121–1180 height exception). Their
   only cause was the rail's sticky mobile bar.
7. **`.preferences-popover`'s `right: calc(380px + 16px)` rule at ≥1181px was
   deleted.** F-11 existed only to keep the Access popover clear of the 380px rail
   column, which no longer exists.
8. **`scripts/evidence-hud-collapse.mjs` is new**, per the repo convention. It is
   the command that produced every EXECUTED runtime claim in this document.

Out of scope and untouched, as instructed: plan step 9 (flipping the remaining
plain sites). `vite.config.ts` and `.claude/launch.json` were not modified.
**Nothing was committed — git is the reviewer's.**

---

## UNVERIFIED / open

- **Feel.** Nothing here claims any of it feels right. Two calls in particular
  want the user's eye: the **roster dossier's card proportions** (a 120px
  portrait beside name/role/stance/principle, with the run record spanning below
  — `evidence/hud-collapse/09-casefile-people-with-lines-1280x800.png` and
  `16-narrow-casefile-people-375x812.png`), and **how empty the collapsed chrome
  now reads** at rest (`01-concourse-collapsed-1280x800.png`) — the strip is two
  counters and one sentence where it used to be a title, a subtitle, a
  breadcrumb and a 380px column. Audition: `http://127.0.0.1:3000/` → concourse.
- **The sheet portrait's exposed `alt` paraphrases the card's own text.** Per
  plan §2.c the dossier is the one surface that exposes the authored alt
  (`"Roster portrait of the Registrar, custodian of legal continuity."`) while
  the card also prints the name and the role. The harness's exact-name count is
  **1 per persona** (the alt says "the Registrar", lowercase), so it passes as
  written — but a screen-reader user would hear the role twice per card. This is
  a real AT taste call the plan pre-decided and I did not re-open; setting
  `alt=""` on the sheet would close it at the cost of the record's own
  description. **Flagged for the reviewer, not silently resolved.**
- **Real devices and real assistive tech. UNVERIFIED.** Everything visual was
  captured in headless Chrome at 1280×800 and 375×812. The AT claims here are
  structural (one `aria-modal` at a time, focus never at `<body>`, one text
  occurrence of each persona name per surface, the alt surviving forced colours),
  not a screen-reader run.
- **Non-Chromium browsers. UNVERIFIED.** Only Chrome was exercised.
- **Viewport heights other than 800 and 812. UNVERIFIED** for the console cap and
  the workspace-height formula; both were tuned against measured chrome at those
  two sizes with ~6px of slack, and the 500px/438px floors are unchanged.
- **The pilot harness's case-81 check** was not run with a seed save, before or
  after; its pre-existing-ness is INFERRED from its own skip branch.
- **Widths between 461 and 840px** got the full-bleed plate but were not swept
  for chrome overlap; the arithmetic says the three controls fit in one row down
  to ~440px (return 157 + summons 265 + gaps), which is where the second-row rule
  takes over — **INFERRED**, measured only at 375 and 1280.
