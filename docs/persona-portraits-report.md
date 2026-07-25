# Persona roster portraits — steps 0 + A–D delivery report

Implements `docs/persona-entities-ui-plan.md` steps **0, A, B, C, D** (its §5
table), under the **Amendment 2026-07-25** art-direction pivot to painterly noir.
Steps **E, F, G** are explicitly **not** in this pass: there is no `People` tab, no
`personaRecord.ts`, and no `CaseFileDrawer`.

Every claim below is tagged **EXECUTED** (a command was run and its output
observed) or **INFERRED** (read, not run). Nothing is committed — the reviewer
owns git.

---

## 0. Headline

| gate | result | register |
|---|---|---|
| `npx tsc -b` | clean | EXECUTED |
| `npx eslint .` | clean | EXECUTED |
| `npx vitest run` | **279 passed / 15 files** (was 271 / 14) | EXECUTED |
| Byte budget | **43,762 B for four portraits, every file < 12,000 B** (gate: ≤12 KB each, ≤48 KB set) | EXECUTED |
| Live evidence, change in place | **37 checks passed / 0 failed** | EXECUTED |
| Live evidence, pre-change tree (`git stash`) | **35 checks passed / 0 failed** | EXECUTED |
| BeatStage live region, before vs after | **byte-identical**, 252 B, SHA-256 `e6de3707…` both | EXECUTED |
| Rail row height, before vs after | **58 / 58 / 58 / 58 px both**, columns `8px 20px …` → `8px 40px …` | EXECUTED |
| `npm run build` → `dist/` | four WebPs, 43,762 B; **no persona PNG master in `dist/`** | EXECUTED |

Two things the reviewer must look at rather than read: **§7 open taste calls** (the
Archivist's 40px read) and **§8 the one provenance gap I could not close honestly**.

---

## 1. Step 0 — asset finishing

**Masters** (byte-for-byte copies of the user-selected candidates):

```
docs/assets/personas/registrar-portrait-original.png   1696×2528
docs/assets/personas/shepherd-portrait-original.png    1696×2528
docs/assets/personas/defector-portrait-original.png    1696×2528
docs/assets/personas/archivist-portrait-original.png   1696×2528
```

**Delivered** — `cwebp` was available at `/opt/homebrew/bin/cwebp`, so `sips` was
not needed. The pre-made 360×418 crops shipped by the selection session were used
unmodified; they were already at the plan's delivery geometry, so the delivered
framing is exactly the framing the user ratified on the contact sheet.

```
$ ls -l public/images/personas/
-rw-r--r--  11882  archivist.webp
-rw-r--r--  10876  defector.webp
-rw-r--r--   9112  registrar.webp
-rw-r--r--  11892  shepherd.webp
TOTAL 43,762 bytes   (budget: ≤12,288 each · ≤49,152 set — met with 5,390 B of headroom)
Ellis reference at identical geometry: 9,410 bytes
```
EXECUTED (`ls -l`, `stat -f %z`).

**DEVIATION — per-persona encode quality (flagged).** The repo's standing setting
is `-q 82`. At a uniform q82 the set is **55,978 B with two files over the 12 KB
per-asset gate** (shepherd 14,228; archivist 21,762) — EXECUTED, full q82→q38
sweep recorded. The plan's stated fallback is "re-encode at lower quality **or**
tighten the crop." Tightening was not available for the Archivist: her extra byte
weight *is* the safeguard — three-quarter length at her post in the stacks, tool
in hand — so cropping toward her face to save bytes would have re-introduced the
mugshot framing §1.3 forbids. Each file therefore carries the highest quality step
that meets the gate: registrar/defector **q82**, shepherd **q78**, archivist
**q46**. The archivist plate was decoded (`dwebp`) and inspected at delivery size
after encoding; the painterly surface absorbs the step-down without visible
blocking (EXECUTED — image read at 360×418).

**Provenance** — `docs/PROVENANCE.md` gains eight rows (master + derived per
persona) and a new `### Persona roster portraits (painterly noir)` section
carrying: generator `nano_banana_2` at 2:3 / 2k, the four generation ids, the
"API exposes no seed, generation id recorded in its place" note, the
one-of-two-candidates selection note, the two-medium decision, the eight retired
photoreal Soul Cast candidates (generated then rejected at the style gate, never
in the repo), the review checklist including the Archivist safeguards item by
item, and the encode/byte table. **See §8 for the one thing that section could not
record faithfully.**

---

## 2. Step A — additive content

Files: `src/game/types.ts`, `src/game/content.ts`, `src/game/content.test.ts`.

`PersonaPortrait { src; caption; alt }` mirrors `CaseFileDossierImage`
(`types.ts:716`–`720`) one-for-one, and `PersonaDefinition.portrait?` mirrors
`CaseFile.dossierImage?`. **Reducer, engine and persistence are untouched**;
static content definitions are never serialized, so there is no save-schema
question to answer (INFERRED — read `persistence.ts` serializes `GameState` only,
per the plan's §0 citation; not re-derived in this pass).

Authored captions — three duty-roster credentials, the Archivist's deliberately
off-register:

| persona | caption | alt |
|---|---|---|
| Registrar | `Registrar · standing credential` | Roster portrait of the Registrar, custodian of legal continuity. |
| Shepherd | `Care ward · standing credential` | Roster portrait of the Shepherd, care-ward advocate. |
| Defector | `Systems office · credential withdrawn` | Roster portrait of the Defector, compromised systems guide. |
| **Archivist** | `No credential issued · shelf zero, kept by hand` | Roster portrait of the Small Archivist, collector of missing categories. |

The Defector's still reads as a credential register entry — the city knows him,
it revoked him. The Archivist's names no credential at all, which is her whole
position and the last thing that could make her read as a subject on file.

**Guard** (`content.test.ts`, three new cases): every persona has a complete
portrait triple or none; a non-vacuity case asserting all four are in fact
authored and each alt names its own presence; and a case asserting the three
credentialed captions say "credential" while the Archivist's says "no credential".

---

## 3. Step B — the component

Files: `src/components/PersonaPortrait.tsx` (new),
`src/components/PersonaPortrait.test.tsx` (new), `src/styles.css`.

- Sizes are CSS, not markup: the `<img>` carries the delivered geometry as
  intrinsic `width=360 height=418` (the `DossierPhoto` precedent) and the frame's
  width comes from `.persona-portrait--chip` 34px / `--card` 40px / `--sheet`
  120px. **Height follows the 360:418 ratio** rather than being squared off — see
  §7, this is a flagged deviation from the plan's "40px square".
- **No filter at rest** (`filter: none` measured live on all four, both
  viewports), per the amendment: the palette is painted into the plate. The
  registry values `grayscale(0.35) contrast(0.98) brightness(0.97)` survive only
  on the `.high-contrast` path.
- **Matted, never blended**: 1px `--line` border, 2px radius, `--night-soft`
  backing, `mix-blend-mode: normal` measured live. No screen composite anywhere.
- **Sigil fallback**: with no authored portrait the frame renders the sigil alone.
  With one, the sigil is still mounted, behind the plate at `opacity: 0`, so the
  forced-colors rule swaps the two in CSS with no second component and no layout
  shift.
- **Forced colors** drops the plate by `opacity`, *not* `display`, deliberately:
  `display: none` would take the sheet's authored alt out of the accessibility
  tree along with the pixels. Measured live: `imgOpacity "0"`, `imgInTree true`,
  `markOpacity "1"`, sigil `<svg>` present, on all four rows.
- **Zero new keyframes, zero new transitions.**

Class names grepped against `src/styles.css` **and** all `src/**/*.tsx` before
use — `persona-portrait`, `persona-portrait-mark`, `persona-portrait-record`,
`persona-portrait-caption`, `persona-chip`, `persona-card`, `entity-card`,
`reaction-portrait`, `beat-portrait`, `portrait-frame`, `persona-mark`: **0
occurrences each** (EXECUTED, `grep -rn src/`). The `.ellis` collision scar is why
every changed surface below also has a screenshot, not only a text assertion.

Five unit cases cover: the plate for all four personas at all three sizes;
`alt=""` + `aria-hidden` on chip and card vs the exposed authored alt on sheet;
the sheet's caption; the mark being mounted in both paths; and the unportraited
fallback branch.

---

## 4. Step C — the chips

Files: `src/components/ReactionQuotes.tsx`, `src/scene/BeatStage.tsx`,
`src/components/Investigation.tsx`, `src/styles.css`.

- **`ReactionQuotes`** — the single seam, so one edit lands the chip in all four
  mount points (filed site card, model-filed dock, event log, scene detail
  drawer). The 17px `.reaction-sigil` became a 34px chip; the dead
  `.reaction-sigil` rules were removed rather than left as dead CSS.
- **`BeatStage`** — the chip renders inside the `<p>` for `kind === 'speaker'`,
  which lives inside the `aria-hidden` stanza. `renderedText()` is untouched, so
  the polite live region above it is untouched. The speaker line became a centred
  flex row so the chip sits before the name without disturbing the centred stanza.
- **Scene result strip** — a 24px chip prefixes each standing delta, sized by CSS
  (`.scene-result-standing .persona-portrait { width: 24px }`) so the component
  keeps its three-size API. It is a mount, not an animation: reduced motion needs
  nothing from it.

---

## 5. Step D — entity cards

Files: `src/components/CaseRail.tsx`, `src/components/Debrief.tsx`,
`src/styles.css`.

- Rail grid `8px 20px minmax(0,1fr) auto` → `8px 40px minmax(0,1fr) auto`.
  **`min-height: 58px` untouched**, and measured live it stays 58px (§6).
- **The idle breathe is gone from portrait rows.** The four phase-offset
  `ambience-breathe` selectors were retargeted from `.persona-sigil` to
  `.persona-portrait:not(.persona-portrait--plated) .persona-portrait-mark`, so a
  fallback row still breathes and a portraited row does not. Measured live:
  `markAnimation: "none"` on the three plated rows, `"ambience-breathe"` on the
  un-plated one, in the same screenshot.
- Debrief blockquotes take the same `card` portrait; the dead `.reflection-sigil`
  rules were removed.
- The pulse ring is untouched (it is a `box-shadow` on the `<li>`, so it still
  rings the row rather than haloing the face — visible in
  `04-rail-entity-cards-after-1280x800.png`, where the Shepherd's row is pulsed).

---

## 6. Live evidence

Harness: `scripts/evidence-persona-portraits.mjs`, raw CDP against the running
dev server on port 3000 (reused, never killed), Node v24.18.0, no added
dependencies. Artifacts in `evidence/persona-portraits/`.

**The before run is a real pre-change tree, not a reconstruction.** The working
tree was `git stash`ed, the identical harness was run as `PORTRAIT_MODE=before`,
and the stash was popped and re-verified green. Both JSONs are kept.

```
$ PORTRAIT_MODE=before node scripts/evidence-persona-portraits.mjs   → 35 passed / 0 failed
$ PORTRAIT_MODE=after  node scripts/evidence-persona-portraits.mjs   → 37 passed / 0 failed
```
EXECUTED.

### 6.1 Row-height equality (plan §6 risk 3 — the gate)

| | row heights | grid columns |
|---|---|---|
| before, 1280×800 | `58, 58, 58, 58` | `8px 20px 226.047px 58.9531px` |
| after, 1280×800 | `58, 58, 58, 58` | `8px **40px** 206.047px 58.9531px` |
| before, 375×812 | `58, 58, 58, 58` | `8px 20px 222.047px 58.9531px` |
| after, 375×812 | `58, 58, 58, 58` | `8px **40px** 202.047px 58.9531px` |

All reads taken with transitions disabled and two frames allowed to pass (the
transition-clock scar). The harness *also* re-measures inside the after document
with the 20px geometry restored by override, as a same-layout control: equal
again. The role line is not clipped in any of the four rows at either width
(`scrollWidth > clientWidth` false ×4 ×2 ×2). EXECUTED.

### 6.2 BeatStage live region — byte-identical

Full flushed stanza text captured in both modes at both viewports:
**252 bytes, SHA-256 `e6de37078b865262…` in all four captures.** The portrait sits
inside the `aria-hidden` stanza and changes nothing an AT user hears. EXECUTED.

### 6.3 Accessibility-tree name counts, per surface

In-page AT-visible text extraction (skips `aria-hidden` subtrees and
`display:none`/`visibility:hidden`; an `<img>` contributes its alt), plus a CDP
`Accessibility.getFullAXTree` dump saved alongside for the record.

| surface | counts, before | counts, after |
|---|---|---|
| `.persona-list` (rail) | 1/1/1/1 | 1/1/1/1 |
| `.reaction-block` (filed card) | Shepherd 1 | Shepherd 1 |
| `.scene-result` (result strip) | Shepherd 1, Archivist 1 | Shepherd 1, Archivist 1 |
| `.scene-beat` (stanza) | Shepherd 1 | Shepherd 1 |
| `.reflection-list` (debrief) | 1/1/1/1 | 1/1/1/1 |
| `.resolved-action` (whole filed card) | Shepherd **2**, Archivist 1 | Shepherd **2**, Archivist 1 |

**Every surface is identical before and after** (EXECUTED, programmatic
comparison of both JSONs). The `.resolved-action` "2" is **pre-existing and not
caused by this change**: that card already printed the Shepherd in its Standing
summary *and* in the attributed line before any portrait existed — the before run
proves it. It is recorded rather than asserted for that reason; the chip's own
surface, `.reaction-block`, is asserted at exactly one.

### 6.4 Screenshot set — 1280×800 and 375×812

`evidence/persona-portraits/`, `-after-` and `-before-` suffixed:

| shot | surface |
|---|---|
| `01-beat-speaker` | Care-ward beat, speaker line with portrait, mid-stanza |
| `02-result-strip` | result strip, 24px chip per delta |
| `03-filed-card-reaction` | filed card, `ReactionQuotes` chip |
| `04-rail-entity-cards` | rail entity cards |
| `05-value-eyeball-four-portraits` | **the value eyeball** (1280×800 only) |
| `06-sigil-fallback` | rail with one portrait unset |
| `07-debrief-reflections` | debrief blockquotes with card portraits |
| `08-forced-colors-rail` | forced colors (1280×800) |
| `09-reduced-motion-beat`, `10-reduced-motion-rail` | reduced motion |

I eyeballed 01, 04 (both widths), 05, 06, 07 and 08 directly. Nothing collides,
nothing overlaps, no row reflows. I make **no claim about whether it feels right** —
that is §7.

The sigil-fallback state is produced by reducing one live rail frame in the DOM to
exactly what the component's fallback branch emits (drop the plate, drop
`--plated`); the branch itself is covered by a unit test. Flagged as a DOM-level
reconstruction rather than a content edit, per the brief's "not in content".

### 6.5 Preference paths and non-pilot regression

- **Forced colors**: all four plates at `opacity 0` with the `<img>` still in the
  tree, all four sigils at `opacity 1` with their `<svg>`, row height still 58.
  Visible in `08-forced-colors-rail-after-1280x800.png` in both the rail and the
  reaction chip. EXECUTED.
- **Reduced motion**: the stanza stays advance-paced (7 lines, no result strip,
  nothing auto-completes), every `.persona-portrait*` computed `animationName` is
  `none` across 42 elements, and no breathe survives on the rail. Both viewports.
  EXECUTED.
- **Non-pilot surfaces**: the Registry intake custody rail is driven through its
  full ritual to its methods and committed in both debrief passes (EXECUTED,
  asserted). Case 77 reconstruction → tribunal → verdict → debrief completes end
  to end at both viewports. **Case 81 is UNVERIFIED in this pass** — the harness
  never opens it; the Case 81 rail additionally renders `DossierPhoto`, which this
  change does not touch, so the risk is low but unmeasured.

---

## 7. Open taste calls — for the user and reviewer, not for me

1. **The Archivist at 40px.** Her plate is three-quarter length at her post,
   because the safeguards require it; the other three are head-and-shoulders. At
   card and chip size she therefore reads as a small standing figure while the
   other three read as faces. This is visible in
   `05-value-eyeball-four-portraits-after-1280x800.png`. I did **not** "fix" it
   with a per-persona `object-position`, because that would silently re-crop a
   user-ratified frame toward her face — the exact framing her safeguards exist to
   prevent. If the reviewer wants her face to carry at chip size, that is a new
   crop decision and it needs the user, not CSS.
2. **Aspect, not square (DEVIATION).** Plan §2.b says "a 40px square portrait".
   Delivered: 40 × 46.11px, the delivered 360:418 ratio, so no size ever re-crops
   the reviewed plate. The measurable constraint the plan actually binds —
   `min-height: 58px` unchanged, row height unchanged — is met either way and is
   proven above. Square would have required per-persona vertical offsets to keep
   four differently-staged subjects in frame; aspect requires none.
3. **The four faces beside Ellis in one screenshot** (plan §6 risk 2's value
   check) is **NOT DELIVERED** and is UNVERIFIED. Case 81's rail is where both
   would appear together, and reaching it live needs a completed Case 77 verdict
   plus a filed Case 81 method to un-gate Social memory. The selection contact
   sheet the user judged did carry Ellis alongside, so the comparison was made at
   selection time; it has not been re-made inside the running shell.

---

## 8. The one provenance gap I could not close honestly

The brief asks `docs/PROVENANCE.md` to carry **the full prompt text**. The
generation session is not this session, and the verbatim painterly-noir style
block and the exact edited negative-constraint list **were not carried across** —
they are not in the plan, not in the scratchpad, and not in the repo (EXECUTED:
searched both).

I did not reconstruct them. A reconstructed prompt written into that ledger reads
as a transcript and is not one, and this repo's provenance file is the artifact
that makes future regeneration reproducible. Instead the section records, clearly
labelled: the amendment's own characterisation of Style B; the four §1.3 casting
paragraphs **verbatim** (those are in the plan); the §1.4 negative list verbatim
with an explicit note that its "Not a painting or illustration" clause must have
been dropped by the pivot and that the edited wording is the missing part; and a
standing instruction to paste the true text in and delete the notice.

**Action for the reviewer:** recover the two prompt blocks from the generation
session and paste them in. Everything else in the section is attestable as
written.

---

## 9. Files, per step, for the reviewer's commits

| step | files |
|---|---|
| **0** | `docs/assets/personas/{registrar,shepherd,defector,archivist}-portrait-original.png`, `public/images/personas/{registrar,shepherd,defector,archivist}.webp`, `docs/PROVENANCE.md` |
| **A** | `src/game/types.ts`, `src/game/content.ts`, `src/game/content.test.ts` |
| **B** | `src/components/PersonaPortrait.tsx` *(new)*, `src/components/PersonaPortrait.test.tsx` *(new)*, `src/styles.css` |
| **C** | `src/components/ReactionQuotes.tsx`, `src/scene/BeatStage.tsx`, `src/components/Investigation.tsx`, `src/styles.css` |
| **D** | `src/components/CaseRail.tsx`, `src/components/Debrief.tsx`, `src/styles.css` |
| evidence | `scripts/evidence-persona-portraits.mjs` *(new)*, `evidence/persona-portraits/**`, `docs/persona-portraits-report.md` *(this file)* |

`src/styles.css` is touched by B, C and D and will need splitting by hunk if the
reviewer wants four clean commits. The three regions are contiguous and separately
commented: the `.persona-portrait` family sits directly after `.registry-caption`
(step B); the `.reaction-line` / `.scene-beat-line--speaker` /
`.scene-result-standing` edits are at their existing homes (step C); the
`.persona-list` grid, the retargeted breathe, and the `.reflection-list` rule are
at theirs (step D).

All three gates were run and observed green **after each step**, not only at the
end (EXECUTED ×4).
