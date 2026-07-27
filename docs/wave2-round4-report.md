# Wave 2 · Round 4 — E6b, document semantics (the Pentiment move)

Status: implemented. Every claim below is labelled **EXECUTED** (a command was
run and its output observed) or **INFERRED** (read, not run). Feel is the user's.

Scope: `docs/enrichment-roadmap.md` **E6b / W2-2** — script variation, corrections
and seal pressure carrying evidentiary meaning on the RECORD surfaces, with the
Wave 1 Easy Read toggle as the escape hatch it was deliberately shipped ahead of.

---

## 1 · What shipped

| file | change |
|---|---|
| `src/components/CaseRail.tsx` | `data-status` on each exhibit row; `.evidence-claim` / `.evidence-contradiction` / `.ledger-pair-claim` / `.ledger-seal` class hooks. **No string, no derivation, no state.** |
| `src/styles.css` | new terminal block: the four status hands, the correction register, the seal, the Easy Read flattening, the high-contrast and forced-colors degradations |
| `scripts/evidence-document-semantics.mjs` | **new** — the two-mode baseline/verify harness, 44 checks, 16 screenshots |
| `scripts/audit-contrast-probe.mjs` | 8 added targets, 3 added surfaces, one instrument fix (§6) |
| `evidence/document-semantics/baseline-computed.json` | **new** — the pre-round computed-style capture the Easy Read gate is asserted against |

No reducer change, no persistence change, no content-file edit, no narrative
string re-worded, no new runtime dependency, no font file, no `--type-*` token
read or retuned, **no new keyframe** (EXECUTED — `git diff src/styles.css | grep
-c '^+.*@keyframes'` → `0`; ink is static). `git diff --name-only -- src/game/`
is empty (EXECUTED).

---

## 2 · The vocabulary, and the argument for each mark

Four statuses are already authored (`EvidenceStatus`, `types.ts:26`) and all four
are used in Case 77. Each now has a hand on the one surface that prints an
exhibit's claim in full. **Every treatment is at most two declarations past the
base** — the brief's "ink, not costume" bound:

| status | the hand | declarations |
|---|---|---|
| **verified** | the registrar's steady hand — upright, written up to full ink, nothing in the margin because nothing qualifies it | `color: var(--record)` · `font-weight: 500` |
| **disputed** | the second-ink margin correction — a **solid** rule in the annotation ink, a stroke another hand finished | `padding-left: 10px` · `border-left: 2px solid var(--amber)` |
| **anomaly** | the **interrupted** rule — the record does not run continuously through this line | `padding-left: 10px` · `border-left: 2px dashed var(--coral)` |
| **testimony** | the quoted deposition excerpt — indent plus the **doubled** rule a bound transcript prints beside speech | `padding-left: 12px` · `border-left: 3px double var(--line-strong)` |

**FORM BEFORE HUE is the rule the whole family obeys.** The four are separated by
`none / solid / dashed / double` and by ink weight, not by colour. That is what
makes §5's degradation cheap: drop every accent and four distinctions survive
intact. It is also what the brief demanded of the correction hand specifically,
and it is measured, not asserted — see the high-contrast and forced-colors rows
in §4.

**The correction hand is ONE mark used twice.** The ledger's `AGAINST IT` half
and the exhibit sheet's revealed contradiction get the same dashed rule, so a
reader learns one mark rather than two. The ledger's half additionally carries
the proofreader's wavy underline **on its two-word label only** — a wavy
decoration under running prose is a legibility cost every reader pays to signal
one state, which is the exact trade Easy Read exists to undo; under two words it
is a correction mark. `THE CLAIM` moves the other way, to `font-weight: 500`, so
the pair reads as two hands: the registrar's entry on the record's own solid
gutter, the second hand annotating it in the margin with an interrupted stroke.

**Seal pressure** lands on the citations a tribunal *weighs* rather than reads:
the carried-in precedent block, any filing row whose `kind === 'precedent'`, and
the citation under a contradiction pair. The mono caption gains a pressed
rectangle — `inline-block`, 3/8px padding, a 1px `--line-strong` edge — and steps
`--fog-dim → --fog`. It is an inked box, **not** a letterpress text-shadow, and
the audit is the reason: a translucent bevel over a dark panel is the
"translucent cleverness that fails under real play conditions" the fifth failure
mode names. The pressure is carried by *more* ink, so the seal raises the row's
contrast rather than spending it (EXECUTED: 8.24 : 1, against the `--fog-dim`
citation register's 4.74 : 1 next to it).

---

## 3 · The redundancy contract, and how it is actually proved

The load-bearing claim of E6b is not "the ink looks like ink" — that is the
user's eyeball. It is that **under `settings.easyRead` every treatment returns to
the register the surface had before this round**. An assertion written only
against the post-change build cannot prove that: it can only prove Easy Read
differs from plain, which a *wrong* flattening also satisfies.

So `scripts/evidence-document-semantics.mjs` has two modes.

1. **`--baseline`, run at the pre-round tree** (before a line of E6b CSS existed)
   captures 12 treated elements × 18 computed properties × 4 modes × 2 viewports
   into `evidence/document-semantics/baseline-computed.json`, plus the
   `-before-` screenshots. **This is the pre-fix artifact**, and it was taken
   first — EXECUTED, 24/24, and re-taken twice while two instrument bugs in the
   harness itself were found and fixed (§6).
2. **Default mode, run after**, asserts four things per scope per viewport:
   - **the flattening** — every treated element's easy-read computed style is
     equal to that baseline file's, property for property;
   - **non-vacuity** — every treated element's *plain* computed style **differs**
     from its plain baseline. Equality alone would pass if the treatments had
     never applied at all;
   - **high contrast** — every FORM carrier survives, and no treatment border or
     decoration is still painted in an accent hue;
   - **forced colors** — no authored accent survives on any treatment.

Every selector in `TREATED` is **positional** (`nth-child` / `nth-of-type`),
never a class or attribute this round introduced. A baseline captured through
`[data-status]` would have matched nothing at HEAD and the equality gate would
have passed on an empty set.

### The seeded exhibit list, disclosed

An authored Case 77 route admits **one** exhibit per closed location, so no
single played run puts all four statuses on one panel without driving four site
rituals. The harness therefore plays **one real filing** (Care ward 12 · listen),
then rewrites **only `evidence`** in the app's own save to four real Case 77
exhibit ids — one per status — and returns through the app's own *Continue*
path, so `decodeGameState` validates the result and the real component renders
it. Only the route is seeded; every string, status and definition on screen is
authored content. **The ledger, its contradiction pair and its citations come
from the real filing, unseeded, and are captured before the rewrite.**

---

## 4 · Verification

All gates under Node 24 against the dev server on :3000.

| gate | result | register |
|---|---|---|
| `npx vite build` | built, no PostCSS error | **EXECUTED** — the mandatory post-`styles.css` gate |
| `npx tsc --noEmit -p tsconfig.app.json` | clean | **EXECUTED** |
| `npx eslint .` | clean | **EXECUTED** |
| `npx vitest run` | **348 passed / 20 files** (unchanged) | **EXECUTED** |
| `scripts/audit-contrast-probe.mjs` | **ALL PASS**, 289 rows (was 219) | **EXECUTED** |
| `scripts/evidence-document-semantics.mjs` | **44 / 44** | **EXECUTED** |
| `scripts/evidence-record-search.mjs` | **97 / 97** | **EXECUTED** |
| `scripts/evidence-hud-collapse.mjs` | **131 / 131** | **EXECUTED** |
| `scripts/evidence-inspector-collapse.mjs` | **117 / 117** | **EXECUTED** |
| `scripts/evidence-rooms-scene-first.mjs` | **153 / 0** | **EXECUTED** |
| `scripts/evidence-persona-portraits.mjs` | **37 / 0** | **EXECUTED** |
| `scripts/evidence-ultrawide.mjs` | **ALL PASS — 192 checks** | **EXECUTED** |
| `scripts/evidence-pilot-care-ward.mjs` | **52 passed / 1 failed** — the documented case-81 seed-save skip, unchanged | **EXECUTED** |

### The Easy Read equality result, in full

EXECUTED, both viewports, both scopes, zero diffs:

```
easyRead@1280 · ledger   · every treated element equals its pre-round register  {"elements":4,"diffs":[]}
easyRead@1280 · evidence · every treated element equals its pre-round register  {"elements":8,"diffs":[]}
easyRead@375  · ledger   · every treated element equals its pre-round register  {"elements":4,"diffs":[]}
easyRead@375  · evidence · every treated element equals its pre-round register  {"elements":8,"diffs":[]}
```

And the non-vacuity half — the same elements, plain, all moved (excerpt,
EXECUTED):

```
ledger pair · the claim          fontWeight: 400 → 500
ledger pair · against it         borderLeftStyle: solid → dashed
ledger pair · correction label   textDecorationLine: none → underline
                                 textDecorationStyle: solid → wavy
                                 textUnderlineOffset: auto → 4px
                                 textDecorationColor: oklch(0.59 0.018 215) → oklch(0.66 0.17 30)
ledger pair · seal citation      display: block → inline-block · paddingLeft: 0px → 8px
                                 borderLeftWidth: 0px → 1px · color: --fog-dim → --fog
evidence claim · verified        fontWeight: 400 → 500 · color: --fog → --record
evidence claim · testimony       paddingLeft: 0px → 12px · borderLeftStyle: none → double
```

One reset in that list is load-bearing and was **measured, not reasoned**:
`text-underline-offset` is **not** part of the `text-decoration` shorthand, so
`text-decoration: none` left the 4px offset behind and the gate named the
correction label as the one element Easy Read failed to flatten. The baseline
computes `auto`; the rule now restores it explicitly.

### Contrast — measured, not assumed

Eight targets and three surfaces **added**; none removed, no floor lowered. The
four status hands are named **separately** rather than measured through one
`.evidence-claim` row — the four treatments are different declarations on
different rows, one of them (verified) moves the row's own colour, and a single
selector would have sampled whichever row came first and reported the other three
as measured when they never were. The evidence surface is probed three times
(rest + two scrolls) because four exhibits with their contradictions open are
taller than the drawer at every width — the round-2 below-the-fold scar, applied.

EXECUTED, worst ratio per row, floor 4.5:

| row | 1280 | 1920 | 375 |
|---|---|---|---|
| evidence · verified hand | 17.13 | 17.13 | 17.13 |
| evidence · disputed hand | 8.24 | 8.24 | 8.24 |
| evidence · anomaly hand | 8.24 | 8.24 | 8.24 |
| evidence · testimony hand | 8.24 | 8.24 | 8.24 |
| evidence · correction block | 14.96 | 14.96 | 14.96 |
| evidence · source citation | 4.97 | 4.97 | 4.97 |
| ledger · pressed seal | 8.24 | 8.24 | 8.24 |
| ledger · correction half | 17.13 | 17.13 | 17.13 |

The verified hand is the only treatment that MOVES a row's contrast, and it moves
it up (`--fog` 8.24 → `--record` 17.13). `evidence · source citation` at 4.97 is
the shipped `--fog-dim` mono register `.persona-dossier-cite` and
`.record-search-cite` already use — recorded, not changed, exactly as round 2
recorded the same number for the filing citation.

### Screenshots

`evidence/document-semantics/`, before/after pairs at 1280×800 and 375×812, in
plain / easyRead / highContrast / forcedColors:

- `evidence-four-statuses-{mode}-{before,after}-{w}x{h}.png`
- `ledger-pair-{mode}-{before,after}-{w}x{h}.png`

The frames to look at first are
`evidence-four-statuses-plain-after-1280x800.png` (the four hands together),
`ledger-pair-plain-after-1280x800.png` (the two hands and the seal) and
`ledger-pair-easyRead-after-1280x800.png` (the same page with every mark gone and
the two authored words doing all the work).

---

## 5 · Deviations, each with its reason

**D1 · The anomaly hand is an interrupted RULE, not a baseline waver.** The brief
offered either. A waver on multi-line prose is a legibility cost paid by every
reader, at every width, to signal one status — the precise trade the escape hatch
exists to undo, imposed by default. The interruption is carried by the rule
instead: same meaning, same one-glance read, no cost to the baseline.

**D2 · The wavy correction mark is on the LABEL, not on the contradiction prose.**
Same argument, one step smaller: two words can carry a proofreader's mark; a
running sentence under a wavy underline is noise. The mark still lands on the
half it belongs to, and the dashed rule beside that half carries the meaning at
paragraph scale.

**D3 · The status chip was NOT touched — including the missing `.evidence-disputed`
colour.** `.evidence-verified`, `.evidence-anomaly` and `.evidence-testimony`
have authored chip colours; `disputed` has none and falls back to the base chip.
Adding one was tempting and is deliberately out of scope: the chip is the
**redundant label carrier**, its colours predate this round, and none of them
flattens under Easy Read. Treating it here would have meant either an element
that violates the equality contract, or a documented exception to the one gate
this item stands on. Recorded as a gap for whoever owns the chip palette.

**D4 · The ledger's own exhibit filings do not carry status ink.** The ledger's
filing row prints title + citation from `RecordEntry`, which has no status field;
carrying one would mean changing `ledger.ts`/`recordIndex.ts` derivations, and the
standing constraint is that derivations stay untouched this round. The exhibit's
status is one tab away on the surface that prints its claim.

**D5 · The precedent seal has never been rendered.** `.ledger-seal` on the
carried-in block and on `data-filing='precedent'` is correct by construction but
Case 77 authors **no** `precedentSource`, so `carriedIn` is always empty there;
the block only ever renders on Case 81, which needs a seed save with a completed
Case 77 verdict (the same gate `evidence-pilot-care-ward.mjs` has documented as
skipped since it was written). The seal that IS rendered, screenshotted and
contrast-measured is the contradiction pair's citation, which uses the identical
class. Tagged UNVERIFIED in §7.

**D6 · The contrast probe's occlusion test was changed.** Disclosed in full in §6
rather than folded in silently.

---

## 6 · Three instrument scars, all found in my own harnesses

All three were false or fabricated results in instruments written this round, and
all three were caught **before** anything was reported as a product fact.

1. **A settings blob the app rejected, read as a mode that applied.** The first
   baseline wrote `textSize: 'normal'`; the valid values are `'standard' |
   'large'`, so `decodeAccessibilitySettings` rejected the **whole** blob, the app
   fell back to defaults, and every "easyRead" capture was silently a *plain*
   capture. It compared equal to plain and would have reported the flattening
   contract as satisfied by a mode that never turned on.
   → **detection rule:** a harness that sets a mode must OBSERVE the mode, not
   intend it. `modeReached()` now reads the portal root's class list and is
   asserted before every capture.
2. **The guard read the wrong element and inverted the result.** Its first draft
   read `.casefile-drawer`; the preference classes live on `.casefile-portal`, its
   parent (`CaseFileDrawer.tsx:125`). It reported every mode as unreached while
   the modes were in fact applying — the mirror image of the bug it was written
   to catch, and a reminder that a guard is itself an instrument.
3. **A "resolution fix" to the contrast probe that quietly changed what was
   measured.** The probe's occlusion test sampled one point — each glyph box's
   centre — so a line whose centre was clear but whose top rows sat under the
   sticky `.rail-tabs` bar was sampled *across the bar*, including the active
   tab's amber underline. Measured at 1920 on the two scrolled ledger surfaces:
   `ledger · findings sentence` reported bright bg `[220, 147, 46]` (`--amber`)
   and **2.15 : 1** on the same glyph box that reads `[4, 6, 7]` and **17.13 : 1**
   at rest, three lines further down the same panel.
   The **first** fix took the longest clear run of rows — which let a box that was
   90% covered qualify on a 2px sliver, silently changed **which** staged beat
   line the probe selected, and produced three brand-new failures (`staged beat ·
   persona line` 10.71 → 3.42 : 1) that were an artifact of the new selection, not
   of the app. The shipped fix keeps the **original centre test verbatim** as the
   qualification, and only clips the sampled band to the contiguous run of rows
   *around that centre*: a sample can shrink, never grow, and only into pixels the
   original test already declared readable.
   → **detection rule:** an instrument edit that changes which element is measured
   is not a resolution fix, it is a different probe. Prove it by diffing every
   pre-existing row.

   **That diff, EXECUTED**, against the probe JSON committed at HEAD: 219 rows at
   HEAD, 289 now, **0 rows lost**, **4 rows moved** — and every one moved *upward*
   with a *smaller* sampled area, which is the mechanism working:

   | row | HEAD | now | sampled px |
   |---|---|---|---|
   | `beat-listen@375 · subject line` | 10.62 | 17.40 | 3332 → 1666 |
   | `beat-pressure@375 · persona line` | 5.62 | 6.23 | 5668 → 4843 |
   | `record-ledger-pair@375 · case-file prose` | 10.62 | 17.13 | 10335 → 6461 |
   | `record-ledger-voice@375 · case-file prose` | 10.62 | 17.13 | 10335 → 6461 |

   No row crossed a threshold in either direction, so no defect is hidden: all
   four were passing before and after.

---

## 7 · A finding outside this item's scope, recorded not fixed

**High contrast never reaches the case-file drawer at all.** The token overrides
at `styles.css:178`–`188` are bound to `.annex-app`, `.deposition-portal` and
`.scene-detail-portal`. **`.casefile-portal` is absent.** The drawer receives the
`high-contrast` *class* (via `recordPortalClass`) but never the re-tokenised
palette, so every colour on all six case-file panels stays on the standard ramp
with the preference on. EXECUTED, from `baseline-computed.json` — with high
contrast ON the evidence claim computes `oklch(0.72 0.018 210)` (standard
`--fog`) rather than high contrast's `oklch(0.83 0 0)`.

This is the same class of bug `recordMode.ts` was written to prevent: the class
list got centralised, this token block did not. It is **not** fixed here — it
moves every colour on four-plus panels and every row of the contrast probe, which
is a re-measurement job, not a typography change. Filed as its own task with the
full re-verification list.

Its only effect on this item is benign and stated for the record: §5's
high-contrast rules resolve `--line-strong` to its standard value inside the
drawer. That value is achromatic (`oklch(0.43 0.022 225)`), so the "no treatment
relies on an accent hue" gate is satisfied on its merits and will only improve
when the portal is added to the list.

---

## 8 · UNVERIFIED / open

- **Feel is unverified, by definition.** Four hands on one page either read as one
  clerk's ledger or as four different UI states wearing costumes, and that is the
  user's eyeball, not a number. The frames are named at the end of §4.
- **The precedent seal has never been on screen** (D5). Case 77 authors no
  precedent source; the identical class IS rendered and measured on the
  contradiction pair's citation, but the carried-in block itself is unrendered,
  unscreenshotted and uncontrast-measured. Closing it needs the same Case 81 seed
  save the pilot harness has been waiting on since it was written.
- **Only Case 77's exhibits have been treated on screen.** Case 81 authors the
  same four statuses (`case81.ts:122`–`210`) and the CSS is status-keyed, so it
  applies by construction — INFERRED, not run. Case 81's copy lengths differ,
  which is where an indent-plus-rule treatment would first look cramped.
- **Large text is untested against the treatments.** `html.annex-large-text` scales
  the type but not the 10/12px indents, so at 112.5% the quotation bracket sits
  proportionally tighter. Nothing suggests a problem; nothing has measured it
  either. The doc-semantics harness would take a fourth mode cheaply.
- **The deposition tray was not touched.** It is a Record Mode surface and the
  brief listed it as canvas, but none of the three work items has a home there:
  `.deposition-statement` carries no status and no contradiction pair. It is the
  natural first surface for E2, which is the next item anyway.
- **No memory entry was written.** The three scars in §6 are stated here rather
  than filed into `~/.claude/projects/.../memory/` — that is the reviewer's file
  to keep, and two sessions writing it concurrently is how it gets clobbered.

---

## 9 · What E2 (legal weather) can reuse

E2 replaces the four stance labels with materialised legal weather on the persona
surfaces, and it inherits three things from this round rather than re-deriving
them.

**1 · The mark vocabulary is already defined and already proved.** `none / solid /
dashed / double` plus a weight step is a four-value alphabet with a measured
degradation path. `getTrustLabel` also returns four values (`committed / open /
guarded / opposed`), and the mapping is nearly written: committed reads as the
full-ink upright hand, guarded as the interrupted rule, opposed as the correction
hand, open as the unmarked base. **Reusing these marks is worth more than
inventing a second set** — a reader who has learned "dashed = the record does not
run continuously here" on the evidence tab should not have to learn a different
dashed on a dossier.

**2 · The recorded class-collision scar has a shipped answer here.** The roadmap
warns that `trust-{label}` classes are the persona signal DOT's `background` fill
and would paint a block behind a word. `persona-dossier-stance` already dodges it
with `data-stance`; this round used `data-status` on the exhibit row for the same
reason and for one more — **an attribute on the ROW reaches several children
without any of them re-deriving the value.** E2 needs exactly that (a stance has
to reach the name, the stance word and the quoted lines), so `data-stance` should
move up to `.persona-dossier-card` rather than a class going onto each child.

**3 · The gate is generic, and E2 should extend it rather than write its own.**
`evidence-document-semantics.mjs` is parameterised by a `TREATED` list of
`[label, positional-selector, scope]`. Adding a `persona` scope plus the persona
rows is a few lines, and — this is the part that matters — **the `--baseline` run
must be taken BEFORE E2's CSS exists**, or the equality gate proves nothing. The
same is true of the probe: stance treatments that move a row's colour (as
`verified` does here) need their own named targets, one per stance, because one
selector will sample whichever card comes first.

**One constraint E2 inherits.** Easy Read must flatten stance styling to the
pre-E2 register, and the persona surfaces are where the redundancy contract is
hardest: the roadmap's own plan is to *remove* the stance word. If the word goes,
the styling becomes the sole carrier and Easy Read has nothing to fall back to.
The escape hatch only works while the label survives underneath it — so E2's
stance word must be retained or replaced by another textual carrier (a dossier
note, a tooltip's accessible name), never simply deleted.
