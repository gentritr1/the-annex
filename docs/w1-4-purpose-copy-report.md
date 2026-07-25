# W1-4 — Purpose copy · REDLINE DRAFT

`[MERGE: audit P2-F + P3-B + P3-C]` · roadmap §3.4 · **not committed**

The builder drafted; the copy is yours. Everything below is wired in and measured, but
**no string here is ratified**. Section 1 is the table to edit — reply with line edits
against the ID column and nothing else needs to be re-specified.

---

## 1. THE REDLINE TABLE

Every drafted string, where it appears, and when it leaves. All five live in one file
(`src/components/purposeCopy.ts`) so an edit is a one-line change in one place.

### 1.1 The five purpose lines — ratify, edit, or strike

| ID | Where it appears | When it appears | When it retires (derived, no new save field) | The exact text |
|---|---|---|---|---|
| **C1** | Concourse command bar — appended inline to the existing threshold sentence, same paragraph, same line | First arrival at the concourse, first case only | The first site is filed (`completedSites.length > 0`), **or** the player carries any completed run (`previousRuns.length > 0`) | Those two become a model, the model becomes a ruling, and the next case inherits the ruling. |
| **C2** | The case-file summon pill, as a second line under its counts. **Desktop only — see OPEN-2** | No evidence has been admitted yet, first case only | The first evidence is admitted (`evidence.length > 0`) | The tribunal reads only what is filed here. |
| **C3** | The site inspector, above a bounded-room console — Case 77's Registry intake, Maintenance spine and Small Archive. Case 81 authors no rooms, so it never renders there (§3.4b) | A room location is in view and nothing has been filed, first case only | The first site is filed | One method files this location — the other stays unread for the rest of the run. |
| **C4** | The memory lattice, between the header and the Rule strip | The lattice is open and no model exists, first case only | A reconstruction is filed (`state.reconstruction`) | The tribunal will not hear findings without a model of what happened — the pair you file is what speaks there. |
| **C5** | The case file's People tab, under "The people on this case" | The roster is opened before the first filing, first case only | The first site is filed | Their standing moves with your route, and what they will give you moves with it. |

Notes on the drafting, so an edit is informed rather than blind:

- **C1** is the critique's heuristic-#10 line. The shipped threshold sentence states the
  *rule* ("The tribunal will hear a record of two sites…"); nothing on the surface stated
  the *campaign model* — that the run produces a ruling and the ruling outlives the run.
  C1 continues that sentence rather than starting a new block, and the reason is measured,
  not stylistic: see **OPEN-1**. It back-references "two sites", so it cannot be reordered
  ahead of the threshold sentence without a rewrite.
- **C2** replaces nothing. The counts stay, because three harness assertions read the live
  counts out of that button's text. **It is a hard length constraint** — the pill is a
  positioned control over the plate; see OPEN-2.
- **C3** exists because a *plain* location already states its cost ("Choose one method.
  This location then closes.") and a *bounded-room* location never did — its ritual
  replaces that prompt entirely. So the one irreversible fact about a site was stated at
  two of Case 77's four locations and not the other two. Deliberately **not** added to the
  plain locations, which would be the same sentence twice.
- **C4** is the audit's own sketch, extended with what the model is *for*.
- **C5** was drafted around what the tab cannot say for itself: the heading names the tab,
  the stance word is visible, but nothing said that a stance is a live consequence of the
  route rather than decoration. It names no persona on purpose — a harness assertion counts
  each persona name in that panel exactly once.

### 1.2 P3-C — number agreement · APPLIED, no wording decision

| ID | Where | Was | Now |
|---|---|---|---|
| **C6** | `src/scene/TribunalChamber.tsx:58` | `1 admitted signals` | `1 admitted signal` — 0 and 2+ keep the plural |

Verified at 0, 1 and 2 admitted items, both viewports (six seeded states).

### 1.3 P3-B — chrome copy length · **NOT APPLIED, needs your ruling**

The audit flagged plate captions as trim candidates but noted they live in
`src/game/cases/`. Roadmap §4.3 makes those strings sacred — *"Staging may change; words
may not"* — and the standing constraint on this round is that content-narrative is
untouched. **So nothing here was edited.** These are for you to rule on:

| ID | File | Current string | Length | Observation |
|---|---|---|---|---|
| **P1** | `case77.ts:1357` | Drag to look · select a threshold | 33 | The component **already ships the trim** as its static variant: `Investigation.tsx:1297` renders `Select a threshold` when the live spatial caption is not in play. So the trimmed form exists and is authored in a component, not in content — the redundancy is the two forms coexisting, not the length. |
| **P2** | `case77.ts:875` | Sensor route · blind interval · dormant credential | 50 | The longest plate caption in Case 77. Three terms where the closeup already shows two of them. |
| **P3** | `case81.ts:433` | Assembly ledger · closed minute · memory seed | 45 | Same three-term shape. |
| **P4** | `case77.ts:52` / `case81.ts:70` | Annex 04 · live civic layer / Precipitation masking | 27 / 21 | Reads as instrumentation, not instruction. No trim proposed. |

Recommendation: leave P1–P4 alone this round. Nothing measured shows caption length hurting
anything, and every one of them is a narrative string. If you disagree, name the
replacements and they will be applied verbatim.

---

## 2. What was built

Six files touched, one added. No reducer, no persistence, no `src/game/cases/` edit, no
schema bump, no new persisted field.

| File | Change |
|---|---|
| `src/components/purposeCopy.ts` | **NEW.** The five strings plus five derived predicates. |
| `src/components/Investigation.tsx` | C1 (inline in the threshold paragraph), C3 (above the room console slot). |
| `src/components/CaseFileDrawer.tsx` | C2 in `CaseFileSummon`, plus a `casefile-summon--oriented` modifier. |
| `src/components/Reconstruction.tsx` | C4 as a sibling of the lattice header. |
| `src/components/CaseRail.tsx` | C5 under the roster heading. |
| `src/scene/TribunalChamber.tsx` | C6, the singular branch. |
| `src/styles.css` | One appended block, five new classes, four selectors added to the Easy Read contrast group. Zero `--type-*` / `--label-*` tokens changed. |
| `scripts/audit-contrast-probe.mjs` | Five **added** probe targets, two added surfaces, and one fixed instrument bug (§3.4). No target relaxed. |
| `scripts/evidence-w14-purpose-copy.mjs` | **NEW.** 58 checks. |

### Retirement without a new field

Every predicate reads GameState fields that already persist — `previousRuns`,
`completedSites`, `reconstruction` and `evidence`. `CURRENT_SAVE_SCHEMA` is
unchanged at 2, `saveMigrations` gains no entry, and `decodeAccessibilitySettings` is
untouched, so the wipe risk at `persistence.ts:355`–`356` is not in play. A shared
`isFirstCase` gate (`previousRuns.length === 0`) means a replaying player sees **none** of
this copy and their glyph budget is exactly where the typography pass left it.

---

## 3. Verification — EXECUTED vs INFERRED

Everything below labelled EXECUTED was run on this machine against the dev server at
`http://127.0.0.1:3000` on Node v24.18.0, headless Chrome over CDP, `el.click()` only.

### 3.1 Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | clean — EXECUTED |
| `npx eslint .` | clean — EXECUTED |
| `npx vitest run` | 299 passed / 17 files, unchanged from baseline — EXECUTED |
| `npx vite build` | built — EXECUTED |
| content-id-leak grep over the W1-4 diff + `purposeCopy.ts` against every `id:` in `case77.ts`/`case81.ts` | 0 leaks — EXECUTED |
| class-collision grep for all five new class names + `purposeCopy` | 0 pre-existing occurrences each, before use — EXECUTED |
| `git diff scripts/evidence-{hud-collapse,rooms-scene-first,pilot-care-ward,persona-portraits}.mjs` | **empty** — no assertion deleted, weakened or re-baselined — EXECUTED |

### 3.2 The dedicated harness — `scripts/evidence-w14-purpose-copy.mjs`

**58 checks, 58 passed, 0 failed** — EXECUTED at 1280×800 and 375×812.

It opens each viewport pass with a **real run** — landing → *"Open a new audit"* → approach
→ concourse, no seeded save — and then asserts, per viewport: each line present at its
moment; each line absent after the trigger; absent for a player with a completed prior run; the shipped `.field-threshold`
still exactly one node; no `role="dialog"` introduced; the roster heading and persona-name
count untouched; the lattice header's `:last-child` rule not stolen; C6 at 0/1/2; Easy Read
renders and promotes every line; reduced motion animates none of them.

### 3.3 The four protected harnesses

All four re-run to completion on the **final** tree — after the last code change, not
before it, so no result here describes a build that no longer exists. **`git diff` on all
four scripts is empty**: no assertion was added, deleted, weakened or re-baselined. —
EXECUTED

| harness | baseline | after W1-4 |
|---|---|---|
| `evidence-hud-collapse.mjs` | 123 | **123 / 123** |
| `evidence-rooms-scene-first.mjs` | 110 | **110 / 110** |
| `evidence-pilot-care-ward.mjs` | 52 + 1 documented skip | **52 passed / 1 failed**, and the one failure is that same documented skip: `[1280x800 case-81] case 81 live flow — no seed save supplied; case 81 is gated behind a completed case-77 verdict` |
| `evidence-persona-portraits.mjs` | 37 | **37 / 37** |

### 3.4 Contrast — `scripts/audit-contrast-probe.mjs`

Five targets added, none relaxed, plus two added surfaces (`casefile-people-fresh`,
`lattice-fresh`) because the existing walk reaches the case file only *after* a filing and
never reached the lattice at all — two of the five lines were unreachable by the instrument
as it stood. **Total failures: 1**, which is the audit's own recorded baseline
(`contrast-probe-after.json`, `failures: 1`) — the same pre-existing `on-plate zone label`
row at the same **2.46 : 1**, unmoved by this change. — EXECUTED

| new target | worst ratio, both viewports | floor | verdict |
|---|---|---|---|
| `.field-purpose` — command bar | **5.04 : 1** on concourse, close-read console ×2 and plate-zones, at 1280 **and** 375 | 4.5 | PASS |
| `.site-cost-note` — inspector | **4.81–4.83 : 1** | 4.5 | PASS |
| `.people-purpose` — roster | **8.24 : 1** | 4.5 | PASS |
| `.lattice-purpose` — lattice | **8.28 : 1** | 4.5 | PASS |
| `.casefile-summon-why` — pill, over the plate | **4.84–5.05 : 1** across four surfaces | 4.5 | PASS |

The pill row is the one worth dwelling on: on the **first** probe run it produced **no row
at all**, because the element did not exist on the path the probe walks. Chasing that
silence is what found the bug in §3.5-3. After the predicate was corrected the same probe
measures it on four surfaces — the row exists now because the copy does.

**And a third defect this exposed — in the instrument itself.** The five new rows first came
back at **1.00 : 1** on every surface *after* the first one, with `textColor` recorded as
`rgba(0, 0, 0, 0)`. That is not a contrast defect; it is a latent bug in
`audit-contrast-probe.mjs`. To sample the background it sets every target's glyphs to
`color: transparent`, saving the prior inline value for `RESTORE`. An element reachable from
**two** targets — one nested inside the other, which `.field-purpose` inside
`.field-threshold` is the first instance of in this repo — was pushed onto the restore list
twice: once with its real value, then once with the `transparent` the first push had just
written. `RESTORE` replays in order, the last write wins, and the element stayed
inline-transparent for the remainder of the run. Fixed by deduping the hide set. Had this
gone unread it would have been reported as five contrast failures that do not exist. —
EXECUTED, before/after in the same probe run.

### 3.4b Case 81 — the roadmap's unreconciled note

*"the audit measured Case 77 only … every Wave-1 acceptance criterion should be re-measured
on Case 81."* Done, at 1280×800, on a seeded Case 81 first run — EXECUTED:

| | Case 81 |
|---|---|
| C1 concourse line | present, inside the single `.field-threshold` node |
| `scrollHeight` vs viewport | **800 / 800** — no scrollbar, the same result as Case 77 |
| C2 summon line | present |
| C5 roster line | present, heading unchanged |
| **C3 site cost** | **absent — and correctly so.** Case 81 authors **no** bounded rooms (no `room`, `acousticShadow` or `custodyRail` on any of its sites), so every one of its locations takes the plain method path, which already ships `Choose one method. This location then closes.` C3 is a Case-77-shaped line by construction, not by oversight. |

### 3.5 Defects caught by looking, not by the build

Both were invisible to `tsc`, `eslint`, `vitest` and `vite build` — the same class of
failure the roadmap's R5 predicted. (A third, in the contrast probe itself, is in §3.4; a
fourth, the command-bar scroll regression, is OPEN-1.)

1. **The summon's purpose line rendered clipped.** `.casefile-summon small` is (0,1,1) and
   pins `white-space: nowrap`; a bare `.casefile-summon-why` is (0,1,0) and lost. Fixed by
   widening the selector to `.casefile-summon small.casefile-summon-why`. Caught by looking
   at the pane. — EXECUTED
2. **Easy Read did not promote that same line.** Same cause, one level up:
   `.easy-read .casefile-summon-why` (0,2,0) lost to the (0,2,1) base rule, so the line sat
   at `--fog-dim` in a mode whose whole purpose is that the text leads. Caught by reading
   the **computed** colour in the harness, not by reading the sheet. — EXECUTED
3. **C2's retirement predicate was wrong, and my own harness agreed with it.** The first
   draft required `events.length === 0` as well as zero evidence. But `SELECT_APPROACH`
   appends an event (`engine.ts:255`), so a real player arrives at the concourse with one
   already in the log and **C2 would never have rendered in play** — dead copy that 56
   green checks called shipped. The seeded save the harness used carried `events: []`, a
   state the game does not produce at that phase: the test exercised the component, not the
   path.

   Found only because the contrast probe — which walks the game the way a player does,
   through *"Open a new audit"* rather than through a seed — reported no such element to
   measure, and that silence was chased instead of shrugged at. Fixed to gate on admitted
   evidence alone, which is also what the line's own words claim ("only what is **filed**
   here"). The harness now opens every viewport pass with a **real run** — no seeded save —
   and asserts the summon reads `0 evidence · 1 events` with the purpose line present, so
   the original failing path is the one under test. — EXECUTED

   *Detection rule for the next round: a first-encounter predicate must be proved on a run
   reached through the UI, never on a seeded save, because a seed can express a state the
   reducer cannot.*

### 3.6 The cross-zone sweep, run as a differential

The summon pill is the one box this change makes taller, and it is a positioned control
over the plate — the recorded cross-zone scar's exact shape. A plain "no control centre is
stolen" sweep is useless in the close-read state, because the world portals stay mounted
*under* the closeup plate by design and fail it for reasons that predate this change. So
the harness measures the same frame twice — with the purpose line painted and with it
forced off, which is the pre-change geometry — and requires the two stolen-centre sets to
be **identical**. — EXECUTED, identical at both viewports, `stolenBySummon` empty
everywhere.

---

## 4. OPEN — three things that need your decision

### OPEN-1 · C1 is inline because a two-row command bar broke a harness assertion

Drafted first as its own line under the threshold sentence, C1 added 24px to the command
bar and pushed the 1280×800 concourse to `scrollHeight` **823** against an 800px viewport,
failing `1280x800 · the collapsed page fits without a scrollbar` in
`evidence-hud-collapse.mjs` (122/123). §4.6 forbids relaxing that assertion, so the line
became an inline continuation of the same paragraph: the two sentences now share one
**1062px** line inside a **1244px** bar and `scrollHeight` is back to **800**. — EXECUTED

**The constraint this puts on your redline:** headroom is ~15%. A C1 edit longer than
roughly **115 characters** wraps the paragraph, re-adds a row, and re-opens that assertion.
Re-run `scripts/evidence-hud-collapse.mjs` after any C1 edit. If you want C1 as its own
visual line, that is possible — but it needs the command bar's grid changed so the line
shares a row with the counters, which is shipped-layout surgery this round did not do.

### OPEN-2 · C2 does not appear at 375×812, and that is a gap, not a solution

At 375 the oriented pill measures **87px** tall against **44px** at rest. An
`elementFromPoint` sweep at each world portal's visual centre showed portals **C and D**
returning `casefile-summon` / `casefile-summon-why` as the owner instead of
`annex-world-portal` — two of the four locations unclickable at their centres. Reproduced,
then confirmed clean at the resting 44px on the same frame. — EXECUTED

There is no free band on the narrow plate to grow into: the portals sit 98px below the
plate's top edge and the world caption owns the bottom. So the narrow layout keeps the
resting pill and **loses C2 entirely**. A first-timer on a phone gets four of the five
lines. Options, none of them free:

- **(a)** Accept the gap (current state). Simplest, and the other four lines still land.
- **(b)** Move C2 out of the pill on narrow only — a caption between the plate and the site
  switcher. New DOM in a new place; needs its own cross-zone and Easy Read pass.
- **(c)** Cut C2 everywhere, on the grounds that a line only half the players see is worse
  than no line. Recovers 0.31 pp of the glyph budget below.

Recommendation: **(a)** now, **(b)** folded into W2-4 (the mobile record sheet), which is
already going to rebuild that region.

### OPEN-3 · The glyph budget is over — criterion 3 FAILS as written

Roadmap §3.4 criterion 3: total glyph area on the 1280×800 concourse may rise by **≤ 1.0
pp**. Re-baselined on this HEAD rather than quoted from a document:

| | 01-concourse @ 1280×800 |
|---|---|
| before (`measurements-w14-before.json`) | **8.0 %** · sizes 7 · pairs 18 |
| after (`measurements-w14-final2.json`) | **9.8 %** · sizes 7 · pairs 19 |
| delta | **+1.8 pp — OVER** |
| budget | ≤ 1.0 pp |

— EXECUTED, both runs by `scripts/audit-design-gap.mjs` against this working tree.

Distinct font sizes on that surface: **7 → 7** — criterion 4 holds; the copy uses
existing roles only. (Distinct size/weight *pairs* rose by one, from C3 reusing
`.site-action-prompt`'s label/650 role on a surface that did not previously carry it.
Criterion 4 pins sizes, not pairs.)

Per-line cost on that frame, so a redline can be aimed rather than guessed — EXECUTED,
glyph line-box area as a percentage of the 1280×800 viewport:

| line | chars | glyph area |
|---|---|---|
| C1 concourse | 92 | **0.762 pp** |
| C3 site cost | 79 | **0.573 pp** |
| C2 summon | 42 | **0.311 pp** |
| **sum** | | **1.646 pp** |

The two numbers are measured differently and are not expected to match: the criterion's
figure is the audit script's occlusion-aware **union** over the whole surface, the table is
a direct **sum** of these three elements' glyph line boxes. Use the table for aiming a
redline and the script's figure for the criterion.

Three ways to land inside the budget, in the order I would take them:

1. **Relax the criterion.** It was written for "a purpose line", singular; the merged item
   ships five, three of which land on this one frame. This is the honest reading and my
   recommendation — but it is your number to move, not mine.
2. **Take OPEN-2 option (c)** — cut C2 everywhere. Recovers 0.311 pp.
3. **Trim C1 and C3 by roughly a quarter each.** Costs meaning; the audit's finding is that
   variety rather than volume is the problem, and a shorter line that says less is not
   obviously a win.

What was **not** done: tightening `line-height` on the new classes to shrink the measured
line boxes. That would move the number without moving the ink, and the metric is already
documented as blind to weight — gaming it would make the next audit lie.

---

## 5. Found in passing

- **Two more number-agreement defects on the tribunal screen, both left alone.** The
  roadmap named exactly one line for P3-C and said of the other one "do not 'fix' that one",
  so scope was held and these are recorded rather than changed. Both observed at 1 admitted
  item, both viewports — EXECUTED, and both visible in
  `evidence/w1-4-copy/10-tribunal-signals-1-1280x800.png`:
  - `Tribunal.tsx:49` renders **`1 items`** in the Admitted record grid — no singular
    branch at all, the same defect P3-C describes, two panels away from the line that was
    fixed.
  - `Tribunal.tsx:118`–`121` renders **`1 admitted item remain contested.`** — it agrees
    the *noun* at 1 and not the *verb*.

  Both are one-word fixes. Say the word and they ship; I did not assume the permission.
- **The audit's fourth P2-F sketch is not built.** "First stance offered — one clause under
  each stance naming what it costs" was excluded from this round's scope. It is the same
  work as roadmap Q2 (whether the stance word leaves the screen), which is unanswered and
  gates W2-6. It should ship with that decision, not ahead of it.

---

## 6. Not done, by instruction

No `git commit`. `HEAD` is still `68179a8`; the working tree carries the change.

`evidence/w1-4-copy/` carries 28 screenshots — for each of the two viewports: the real-run
concourse, each line's first-encounter state, each line's retired state, the veteran (run 2)
concourse, the three C6 tribunal states, and the Easy Read concourse.

## 7. If the copy changes, re-run these

A redline is not free. After editing `src/components/purposeCopy.ts`:

```
npx tsc --noEmit -p tsconfig.app.json && npx eslint . && npx vitest run && npx vite build
node scripts/evidence-w14-purpose-copy.mjs      # 58 checks — placement and retirement
node scripts/evidence-hud-collapse.mjs          # 123 — C1 length re-opens the scroll gate
node scripts/audit-contrast-probe.mjs           # AA on every new line
node scripts/audit-design-gap.mjs w14-<label>   # the glyph budget in OPEN-3
```

Node 24 for the harnesses (`~/.nvm/versions/node/v24.18.0/bin/node`); dev server on
`http://127.0.0.1:3000`.
