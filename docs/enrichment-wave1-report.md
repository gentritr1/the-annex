# Wave 1 build report — W1-1, W1-2, W1-3

**Scope.** `docs/enrichment-roadmap.md` §3.1 (subtitle-grade presentation controls), §3.2
(Record Mode, named and typed), §3.3 (Easy Read toggle). **§3.4 / W1-4 (purpose copy) was
NOT built** — it is writer-gated on Open Question 3 and was excluded from this round.

**Baseline commit.** `bb62654`. Working tree at start: `src/` and the four evidence
harnesses clean; a previous session had left modified PNGs under `evidence/pilot-care-ward/`,
`evidence/rooms-scene-first/`, `evidence/persona-portraits/` and `evidence/hud-collapse/`
(mtimes 22:21–22:36, before this session's first command at 22:49). Those are harness
outputs, not source, and are re-written by every harness run.

**Evidence root.** `evidence/enrichment-wave1/` — 103 files: 96 screenshots (66 mode pairs
from `evidence-wave1-shots.mjs`, 26 from `audit-wave1-probe.mjs`, 4 contrast bands) and 7
JSON measurement artefacts.

Every claim below is labelled **EXECUTED** (a command was run and its output observed) or
**INFERRED** (read from source, not run). Nothing is labelled from the roadmap's own numbers.

---

## 1. Gates

| gate | before | after |
|---|---|---|
| `npx vitest run` | 294 passed / 16 files | **299 passed / 17 files** |
| `npx tsc --noEmit -p tsconfig.app.json` | clean | clean |
| `npx eslint .` | clean | clean |
| `npx vite build` | — | clean (run after **every** `styles.css` edit) |

**EXECUTED.** The +5 tests are the two extended `decodeAccessibilitySettings` cases in
`src/game/persistence.test.ts` and the three new cases in the new
`src/game/persistence.roundtrip.test.ts`.

## 2. The four harnesses

| harness | expected | measured after |
|---|---|---|
| `scripts/evidence-pilot-care-ward.mjs` | 52 + 1 documented seed-save skip | **52 passed / 1 failed** (the failure is `[1280x800 case-81] case 81 live flow → skipped: no seed save supplied`) |
| `scripts/evidence-rooms-scene-first.mjs` | 110 | **110 passed / 0 failed** |
| `scripts/evidence-persona-portraits.mjs` | 37 | **37 passed / 0 failed** |
| `scripts/evidence-hud-collapse.mjs` | 123 | **123/123 checks passed** |

**EXECUTED**, Node v24.18.0, against the live Vite dev server on port 3000 (reused, never
killed).

**R1 — zero harness assertions edited.** `git diff -- scripts/evidence-pilot-care-ward.mjs
scripts/evidence-rooms-scene-first.mjs scripts/evidence-hud-collapse.mjs
scripts/evidence-persona-portraits.mjs | wc -l` → **0**. **EXECUTED.** The three assertions
that count `.scene-beat-line` DOM nodes and require `>= 6` pass untouched, because the
two-line cap is a painted window and every revealed line stays mounted (§4 below).

---

## 3. W1-1 — Subtitle-grade presentation controls

**Files.** `src/scene/BeatStage.tsx` — **not modified** (see the deviation note in §7).
`src/styles.css` (`.scene-beat-lines`, `.scene-beat-line`, the shared staged-text rule, the
new `.scene-beat-lines::before` veil, the `.subtitle-plate` family, the subtitle-preview
block), `src/game/types.ts`, `src/game/engine.ts`, `src/game/persistence.ts`,
`src/components/CaseHeader.tsx`, `src/components/StartScreen.tsx`, the three portal
boundaries via the new `src/components/recordMode.ts`, `src/App.tsx`,
`scripts/audit-contrast-probe.mjs` (targets added, none removed),
`src/game/persistence.test.ts`, `src/game/persistence.roundtrip.test.ts`.

### 3.1 R4 — the premise was REPRODUCED before anything was changed

The probe had no `.scene-beat-line` target and never staged a beat, so the roadmap's premise
was untested. The probe was extended first (two targets, plus a Care-Ward beat surface per
authored `data-preview-treatment`), then run on the **unmodified `src/`** — restored with
`git stash push -- src/`, the method §3.1 prescribes.

**EXECUTED.** Worst composited pixel, WCAG floor 4.5:1:

| surface · target | BEFORE (unmodified src) | AFTER | Easy Read ON (floor 7:1) |
|---|---|---|---|
| beat-listen@1280 · subject | **1.80 : 1** (weight 300) | not sampled¹ | 16.91 |
| beat-listen@1280 · persona | **1.23 : 1** (weight 300) | 10.71 (weight 400) | 12.51 |
| beat-listen@375 · subject | 6.76 | 10.62 | 10.62 |
| beat-listen@375 · persona | **3.31 : 1** | 11.68 | 12.65 |
| beat-pressure@1280 · subject | 5.50 | 17.40 | 17.40 |
| beat-pressure@1280 · persona | 4.53 | 11.09 | 12.71 |
| beat-pressure@375 · subject | 17.40 | not sampled¹ | — |
| beat-pressure@375 · persona | **1.58 : 1** | 5.62 | 12.72 |

¹ "not sampled" is not a gap in coverage: with the two-line window active the FIRST matching
line in document order is often the one pushed off the top of the plate, so the probe's
first-visible-match rule finds a different element on that surface (see §6).

**The premise holds.** Four of eight rows failed AA before, the worst at 1.23 : 1 — the beat
text was the least legible narrative text in the game and had never been measured. Every row
passes after. Artefacts: `evidence/enrichment-wave1/contrast-probe-BEFORE.json`,
`contrast-probe-AFTER.json`, `contrast-probe-EASYREAD.json`, and the paired
`contrast-band-beat-*` band screenshots.

### 3.2 The two-line window is painted, never unmounted

`.scene-beat-lines` gains `--stanza-line` / `--stanza-gap` / `--stanza-window` and
`max-height: min(62%, var(--stanza-window))`. The narrow plate re-derives the window from the
size and gap **it** authors (`--type-read`, 6px), because a window written against the
desktop face let five lines through at 375×812 — measured, then fixed.

**EXECUTED**, `scripts/evidence-wave1-shots.mjs`, both viewports, all three modes:

| mode | flushed stanza: mounted nodes | painted inside the window | sr-only live-region lines |
|---|---|---|---|
| baseline @1280 | 7 | **2** | 7 |
| subtitle-plate @1280 | 7 | **2** | 7 |
| easy-read @1280 | 7 | **7** (window lifted) | 7 |
| baseline @375 | 7 | **2** | 7 |
| easy-read @375 | 7 | **7** | 7 |

The DOM node count and the assistive-technology channel are identical in every mode. Mid-beat
per-step counts (8 samples per viewport, transitions and animations frozen, two frames
allowed to pass) are in `evidence/enrichment-wave1/wave1-probe-after.json` under
`window-steps@…`: never above 2.

Screenshots: `12-beat-mid-*`, `13-beat-flushed-*` at both viewports × three modes.

**Reduced motion and Easy Read are exempt**, and the exemption is measured against the OS
signal (`Emulation.setEmulatedMedia prefers-reduced-motion: reduce`), not just the in-app
class: 7 mounted / **0 clipped**. This closed a real latent bug — the shipped `max-height: 58%`
clipped 2 of 7 lines at 375×812 under reduced motion, where nothing auto-advances and the
player has no way to reach them. **EXECUTED**; `09-reduced-motion-beat-after-375x812.png`.

### 3.3 The plate

Two layers, both measured:

- **Default scrim, always painted** — a gradient modelled on `.world-caption::before`, with
  its shallowest stop at alpha 0.80, solved against the brightest measured pixel behind the
  text (251) so the top line of the window clears 4.5 : 1 rather than averaging above it.
- **`subtitlePlate` ON** — a solid `oklch(0.05 0.004 240 / 0.96)` card. Solid, not a
  gradient, so its alpha is readable straight off the computed style.

**EXECUTED**: toggling ON adds `.subtitle-plate` to the shell and changes the computed
`backgroundColor`; toggling OFF restores the pre-toggle painting exactly (both asserted).
Screenshots `04-subtitle-plate-on-after-*`, `13-beat-flushed-subtitle-plate-*`.

**The mask was removed, and that was a measured decision, not a preference.** The shipped
`mask-image` faded the stanza's older clauses off the top. A mask fades the element's
*background* as well as its glyphs, so once the plate lived on that element the mask made the
scrim translucent exactly where a partially-clipped line still paints: the persona line's
remnant measured **2.70 : 1** at 375×812 through the faded band. The fade is now a **veil**
(`.scene-beat-lines::before`) painted *over* the cut in the plate's own colour, scaled to
`var(--stanza-line)`. An overlay only ever adds opacity where text is; a mask only ever
removed it, which is why the veil cannot repeat the defect. **EXECUTED** — the same probe row
went 2.70 → 5.62 : 1.

### 3.4 Weight

`.scene-beat-line--subject` / `.deposition-statement` (the shared voice rule) and
`.scene-beat-line--persona` move 300 → **400**. Computed weight ≥ 400 asserted at both
viewports. **EXECUTED.** Criterion 11 honoured: because the change is on the SHARED rule, the
deposition stage was re-measured too (§4.3).

### 3.5 Size

`textSize: 'large'` scales the staged subject line by ≥ 112.5 % at both viewports **and the
window still holds at ≤ 2 painted lines** — the window is expressed in the same `rem` token
the line uses, so it moves with the face. **EXECUTED.**

### 3.6 The control and the preview

The Access popover now shows **exactly 7 checkboxes** in authored order with the two new ones
last (`Easy read`, `Subtitle plate`), every row ≥ 44 × 44 px. `StartScreen`'s parity list
gains the same two (the F-11 parity rule). **EXECUTED**, both viewports.

**Cross-zone sweep** on the header strip (every `.case-header` button/summary plus every
popover checkbox): pairwise box-intersection **0 overlaps**, `elementFromPoint` at each
control's visual centre **0 unreachable**, at 1280×800 and 375×812. **EXECUTED.**

**Preview (XAG-104).** A live sample line inside the popover, styled by the current subtitle
settings — same plate, same window, same halo/flattening. It deliberately does **not** reuse
`.scene-beat-line` / `.scene-beat-lines`: those class names are counted by three harness
assertions and read by the contrast probe with `querySelector()`, and a second copy earlier in
document order would make every one of them measure the header instead of the scene. The
preview classes are joined to the beat's rules in the stylesheet instead. Asserted:
`.case-header .scene-beat-line` count is **0**. **EXECUTED.**
New authored copy (curly punctuation, in voice): `She answers too quickly.` /
`“The rain was inside.”` / the label `Sample`.

### 3.7 Persistence — the wipe test

`easyRead` and `subtitlePlate` are **booleans**, default `false`, decoded optional-tolerated
exactly like `ambientSound`. **`CURRENT_SAVE_SCHEMA` stays at 2, no `saveMigrations` entry**
(`git diff src/game/persistence.ts` shows neither). The reducer's `UPDATE_SETTING` branch is
untouched; `src/game/engine.ts` changes by exactly the two `false` defaults.

`src/game/persistence.roundtrip.test.ts` (**new**, jsdom) writes a v2 save whose settings blob
has the five fields the pre-change build wrote — spelled out, not derived from the current
default — into real `localStorage`, then loads it through the post-change `loadGame()`:

- `loadGame()` non-null; `runNumber`, `precedents` and `previousRuns` intact. **EXECUTED.**
- the standalone `the-annex.accessibility.v1` key decodes the same way. **EXECUTED.**
- a malformed `easyRead: 'yes'` still rejects the whole save — optional-tolerated is not
  permissive. **EXECUTED.**

Live reload check: set both preferences through the real checkboxes, reload, assert they are
in storage **and** on the shell. **EXECUTED**, both viewports.

---

## 4. W1-2 — Record Mode, named and typed

**Files.** `src/components/recordMode.ts` (**new**), `src/components/Deposition.tsx`,
`src/components/SceneDetailDrawer.tsx`, `src/components/CaseFileDrawer.tsx`, `src/App.tsx`,
`src/styles.css`.

### 4.1 The shared seam

The three portals each rebuilt the view-preference class list by hand — the exact shape of
risk R3. That list is now written once in `recordMode.ts`, which also names the pattern:

```
preferenceClasses(settings)          // the five view preferences
appShellClass(settings)              // 'annex-app' + those
recordPortalClass(base, settings)    // base + 'record-mode' + those
```

A new preference now reaches every boundary by construction. **INFERRED from source** that
this removes the class of bug; **EXECUTED** that it works: with all five preferences on and a
record surface open, `record-mode`, `reduce-motion`, `high-contrast`, `large-text`,
`easy-read` and `subtitle-plate` are all present on the portal root, at both viewports.

### 4.2 Mutual exclusivity

`document.querySelectorAll('.record-mode').length === 1` with exactly one record surface open
— asserted separately for the detail drawer and the case file, at both viewports.
**EXECUTED.**

### 4.3 Reading typography

One documented block setting exactly two things — measure and leading — and **no sizes at
all**. `git diff -U0 src/styles.css | grep '^+' | grep -c 'font-size: [0-9]'` → **0**
(criterion 4, the P3-A guardrail). **EXECUTED.**

Measure is `min(100%, 52ch)`, not 68ch. `ch` is the advance of a *zero*, and in this
proportional face a zero is ~1.3× the mean glyph: a 68ch cap measured **88** real characters
in the case file and **95** in the deposition tray — outside the 45–80 band the cap exists to
hold. Measured, then corrected.

**EXECUTED**, rendered line-box width ÷ mean glyph advance taken from a canvas using each
element's own resolved font:

| surface | selector | measure (chars) @1280 | @375 | line-height |
|---|---|---|---|---|
| detail drawer | `.scene-detail-description` | 72 | 54 | 1.6 |
| detail drawer | `.scene-detail-method p` | 74 | 54 | 1.6 |
| case file | `.rail-panel p` | 68 | 65 | 1.6 |
| case file | `.rail-note` | 68 | 65 | 1.6 |
| deposition tray | `.deposition-statement` | 72 | 45 | 1.6 |

Scene Mode's stanza line-height is **unchanged at 1.45** — the difference between the two
stages is deliberately the only typographic difference.

The deposition tray is the one Record Mode surface the wave-1 probe cannot reach (Case 81 is
gated behind a completed case-77 precedent), so its measurement lives in
`scripts/evidence-wave1-shots.mjs`, which already seeds that save. Criterion 11 is therefore
closed on both stages, not just the reachable one.

### 4.4 Type inventory did not move

`scripts/audit-design-gap.mjs` run before and after **on the same commit** (`git stash push --
src/` for the before), not compared against numbers quoted in a document. **EXECUTED:**

- distinct font sizes and (size, weight) pairs are **identical on all 18 measured surfaces**,
  including the case-file drawer (8 sizes / 24 pairs at 1280, 6 sizes at 375).
- glyph area rises by at most **+0.51 pp** (375 close-read console); +0.10 pp on the case file
  at 1280. The rise is traceable: `12.16px/400` gains 1 974 px² on the concourse, which is the
  two new Access checkbox labels — the audit script counts `<details>` content even when the
  popover is closed, so this is inventory, not visible ink.

Artefacts: `evidence/enrichment-wave1/measurements-w1before.json`, `measurements-w1after.json`.

### 4.5 Composited contrast inside `.record-mode`

Record surfaces were added to the contrast probe as new targets (additive; nothing removed)
and probed on their own surface passes. All ≥ 4.5 : 1 at both viewports: surface record 8.24,
method prose 7.87, case-file prose and note 4.97. **EXECUTED.**

---

## 5. W1-3 — Easy Read

**Files.** the same schema files, the three portals via `recordMode.ts`, `src/App.tsx`,
`src/styles.css` (one override family modelled on the shipped `high-contrast` family).

**Payload, all EXECUTED:**

1. **Boolean `easyRead`, default `false`**, optional-tolerated decode. §3.7.
2. **Class reaches the shell and all three portal roots.** Asserted at rest and with a record
   surface open.
3. **Bounded uppercase sweep** — no element inside `.annex-app` or any portal root computes
   `text-transform: uppercase` **and** letter-spacing > 0.06em **and** carries more than four
   words of its own text. Swept at **five surfaces** (beat, detail drawer, case file, the
   Small Archive's document register, the Case 81 deposition tray) × both viewports:
   **CLEAN**. This found three real offenders that a single-surface sweep missed — the plate
   caption (`Impossible rain · listening / pressure`, 6 words), the site label
   (`B · Care ward 12`, 5 words), and the deposition tray's header line
   (`Deposition suite · Take the sworn statement`, 7 words, wearing the `.case-code` class
   despite being a sentence). The shell's real code (`CMA—77—A`) keeps its caps: it is an
   identifier, and flattening an identifier makes it harder to read.
4. **Halo off, plate opaque.** `.scene-beat-line` computed `text-shadow: none`; the stanza's
   computed background alpha **0.96** (≥ 0.80 required), forced regardless of `subtitlePlate`.
5. **No content removed.** `document.body.innerText` set-difference between OFF and ON is
   empty at both viewports. Compared case-insensitively and whitespace-normalised **on
   purpose**: `innerText` reflects `text-transform`, and undoing decorative uppercase is the
   mode's job — a raw comparison would report `SAMPLE → Sample` as removed content. The claim
   under test is that no text disappears, not that no glyph changes shape.
6. **7 : 1 on narrative prose.** The probe was given a `PROBE_SETTINGS` seed so the mode is
   reached through the real load path, and its floor rises to 7 : 1 when `easyRead` is set.
   Every narrative target passes: staged beat 10.62–17.40, record-mode prose 7.87–17.13. Four
   dimmed chrome roles measured 4.50–5.04 : 1 and were stepped up one rung on the **same**
   palette under Easy Read only (`.rail-panel p`, `.rail-note`, `.field-objectives > span`,
   `.field-threshold`, the room prompts) — no new colour invented, nothing outside the mode
   moves.
7. **No `!important` to win.** Every Easy Read rule composes by source order at the end of the
   sheet; verified by reading computed values with all four other preferences on, not by
   reading the cascade.

**The window is lifted under Easy Read** (7 mounted / 7 painted), and so is the veil — a veil
there would dim the first line of a stanza the player is being shown in full.

Screenshots: `13-beat-flushed-easy-read-*`, `14-detail-drawer-easy-read-*`,
`15/16/17-casefile-*-easy-read-*`, `18-document-register-easy-read-*`,
`20-deposition-tray-easy-read-*`, at both viewports, each with its `baseline` and
`subtitle-plate` counterparts for comparison.

---

## 6. Changes to `scripts/audit-contrast-probe.mjs` (all additive)

1. Two new targets, `.scene-beat-line--subject` and `.scene-beat-line--persona`; five new
   Record Mode targets. **Nothing removed.**
2. A `stageBeat()` helper and beat surfaces per authored `data-preview-treatment`
   (`listen`, `pressure`), plus record-surface passes. Without these the new targets would
   never be present.
3. `PROBE_SETTINGS` / `PROBE_LABEL` env seeds, so a preference mode can be measured through
   the real load path and before/after artefacts do not overwrite each other.
4. **A real fix, not a convenience:** per target the probe now takes the first match with
   *visible* glyph boxes instead of blindly `document.querySelector`. With the window active
   the first line in document order is frequently pushed off the top of the plate and painted
   nowhere, and the old code would report "no target" for the very text that IS on screen.
   This improvement was applied **before** the before/after pair was re-measured, so both
   sides use it.

---

## 7. Deviations, and why

**D1 · `BeatStage.tsx` was not modified.** §3.1's file list names it, but the load-bearing
design note requires the cap to be a painted window with every line still mounted — which is
entirely a stylesheet concern. Touching the component would have added risk without adding
capability. The `.scene-beat-lines` container already had `max-height` and `overflow: hidden`;
the window is those two, re-derived.

**D2 · The default scrim is not off by default, and criterion 8's literal reading could not
be satisfied.** Criterion 3 requires `.scene-beat-line--subject`/`--persona` to measure
≥ 4.5 : 1 at both viewports and under both treatments. Criterion 8 says toggling
`subtitlePlate` OFF "returns it to the pre-change value". Given the measured baseline
(1.23 : 1), those two are mutually exclusive: a scrim that only exists when a default-off
toggle is on leaves the default player below AA. Criterion 3 wins, so the scrim always paints
and the toggle upgrades it to an opaque card. Criterion 8 is satisfied against the
**pre-toggle** value, which is asserted exactly. **This is the one place where the shipped
behaviour differs from a literal reading of the brief, and it is a deliberate call — flag it
if you disagree.**

**D3 · The stanza's `mask-image` was removed.** Measured, §3.3. The fade it provided is now a
veil painted over the cut. Under high contrast the sheet's existing `mask-image: none` rule is
now redundant but harmless; it was left alone rather than widen the diff.

**D4 · The subtitle preview is a miniature.** A 250 px popover cannot show a 620 px stanza at
true size, so the preview steps one rung down the same token scale the narrow plate already
steps down to (`--type-read` / `--type-body`, tokens, never literals). What it previews
truthfully is the *presentation* — plate, window, halo, flattening — not absolute size.

**D5 · Two probe gaps in my own harness were found and closed mid-build**, and both had
produced a false PASS: the Easy Read uppercase sweep originally ran only on the surface that
happened to be open (missing three offenders), and the Record Mode measure was collected for
the case file but never asserted (missing an 88-character line). Both are now asserted.

**D6 · Wave 1 may add rules but never retune tokens.** `git diff` on `src/styles.css` shows
**0** changed lines touching any `--type-*` or `--label-*` token. **EXECUTED.**

---

## 8. UNVERIFIED / open

**U1 · Does the plate read as too heavy? — taste, and it is yours.** §4.7 says feel closes on
an eyeball, never a number. The staged beat now sits on a real card at all times. The numbers
say it is legible; whether the scene still *leads* is your call. Look at
`13-beat-flushed-baseline-1280x800.png` against `evidence/pilot-care-ward/06-beat-flushed-*`
from before, and at `13-beat-flushed-subtitle-plate-*` for the opaque variant.
**UNVERIFIED — needs your acceptance.**

**U2 · A PRE-EXISTING AA failure was surfaced and NOT fixed.**
`.site-closeup-zone-label` on the custody console at 1280×800 measures **2.46 : 1** (floor
4.5). It measures **identically in the BEFORE run**, so it is not caused by Wave 1 — the
probe's first-visible-match fix (§6.4) simply made it visible for the first time. Out of Wave
1's scope; it belongs in a Wave 2 item or a follow-up. **EXECUTED that it is pre-existing;
NOT FIXED.**

**U3 · Case 81 coverage is partial.** The roadmap's closing note asks every Wave-1 criterion
to be re-measured on Case 81. Case 81 authors no `beat[]` and no `previewTreatment`, so the
subtitle window and plate criteria have no Case 81 surface to measure. What *was* measured on
Case 81: the deposition tray (Record Mode measure, weight, leading, Easy Read sweep) at both
viewports, plus screenshots `19-case-81-site-*` and `20-deposition-tray-*` in all three modes.
The contrast probe still runs Case 77 only. **PARTIAL.**

**U4 · Real devices.** Everything here is headless Chrome at emulated 1280×800 and 375×812.
No physical device, no second browser engine. **UNVERIFIED.**

**U5 · Not committed.** Per the brief, the reviewer owns git. Nothing was staged or committed.

---

## 9. New and changed files

**New source:** `src/components/recordMode.ts`, `src/game/persistence.roundtrip.test.ts`.
**Changed source:** `src/App.tsx`, `src/components/CaseFileDrawer.tsx`,
`src/components/CaseHeader.tsx`, `src/components/Deposition.tsx`,
`src/components/SceneDetailDrawer.tsx`, `src/components/StartScreen.tsx`,
`src/game/engine.ts`, `src/game/persistence.ts`, `src/game/persistence.test.ts`,
`src/game/types.ts`, `src/styles.css`.
**New scripts:** `scripts/audit-wave1-probe.mjs` (46 checks, 0 failures),
`scripts/evidence-wave1-shots.mjs` (66 screenshots + sweeps + deposition measure).
**Changed script:** `scripts/audit-contrast-probe.mjs` (additive only).
**Untouched:** all four evidence harnesses, the reducer's game logic, every authored
narrative string in `src/game/cases/*.ts`.

**Class-collision grep before use** — `record-mode`, `easy-read`, `subtitle-plate`,
`subtitle-preview*`: 0 pre-existing occurrences across `src/` and `scripts/`. **EXECUTED.**
**Content-id-leak grep** on the new UI copy: no case location, action or decision id appears
in `CaseHeader.tsx`, `StartScreen.tsx` or `recordMode.ts`. **EXECUTED.**
