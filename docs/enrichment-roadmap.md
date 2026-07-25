# Enrichment roadmap — turning the UI-patterns research into work

**Inputs.** `docs/research/ui-patterns-deep-research.md` (the commissioned deep-research
report; its eight "highest-payoff enrichments" at `:69`–`:115` are the candidate work) and
`docs/design-gap-audit-2026-07.md` (the measured text-dominance / ambience / comprehension
audit). Both were read in full. Where a finding and an enrichment attack the same problem
they are **merged into one work item** and labelled `[MERGE]`.

**Status of this document.** Planning only. Nothing here has been built. Every claim about
current code is cited `file:line` and was read, not inferred from a doc. Claims that come
from a *report* rather than from source are marked **(reported)** — the two reports
(`hud-collapse-report.md`, `design-gap-audit-2026-07.md`) are themselves evidence-bearing
but they are second-hand here.

**One sequencing fact, resolved mid-drafting.** The audit's implemented pass — the eight-step
`--type-*` scale, the console alpha, the `.world-caption::before` scrim — was an uncommitted
working-tree change when this roadmap was started and **landed as commit `97c8704`
("Type hierarchy and translucency pass: the room leads, the text serves") while it was being
written**. Every `src/styles.css` citation below was therefore re-verified against the new
HEAD after the commit landed; the tree is clean and `--type-label` is at `src/styles.css:48`.
Wave 1's precondition (§3) is **satisfied**, and R5 downgrades accordingly. Anyone reading
this at a later commit should re-check the `styles.css` line numbers before quoting them —
they are the most volatile citations here.

---

## 1. The eight enrichments, mapped onto this codebase

| # | Enrichment (research) | Primary surfaces in this repo | What already half-exists | Real effort here | Blocked by | Wave |
|---|---|---|---|---|---|---|
| E8 | Subtitle-grade presentation controls | `scene/BeatStage.tsx`, `scene/DepositionBeatStage.tsx`, `components/CaseHeader.tsx`, `styles.css`, settings schema | reduced-motion static path, advance-pacing, length-scaled holds, speaker indication, sr-only mirror | **S–M** | settings schema (§4.5) | **1** |
| E1 | Scene Mode / Record Mode split | `Deposition.tsx`, `SceneDetailDrawer.tsx`, `CaseFileDrawer.tsx`, `styles.css` | **three Record Modes already shipped** — see §1.2 | **S** (normalize) + **M** (E1b, retire the duplicate) | E8 (shared type block) | **1** / 2 |
| E6a | Easy Read toggle | settings schema, `styles.css`, three portal boundaries | `high-contrast` is the exact precedent, with a full override family | **S** | settings schema | **1** |
| E6b | Pentiment document semantics | `CaseRail.tsx` evidence panel, `Deposition.tsx`, new content fields | `EvidenceStatus` + `.evidence-{status}` is a proto ink-state | **M** | E6a (the escape hatch) | 2 |
| E5 | Searchable case file / query trail | `CaseRail.tsx`, new pure index module | four built tabs; `personaRecord.ts` proves the pure-transpose pattern | **M** | E1a | 2 |
| E3 | Ledger + structured filings | `CaseRail.tsx`, `Reconstruction.tsx`, `ClassificationRoom.tsx` | reconstruction **is** a structured filing; classification room **is** a grouped filing | **M** | E5's index | 2 |
| E2 | Legal weather replacing stance labels | `previewTreatment.ts`, `types.ts`, `CaseRail.tsx`, `Debrief.tsx`, `styles.css` | `previewTreatment` is a shipped, pure, authored per-action treatment resolver | **M** (ambient) / **L** (chorus copy) | E6a + E6b | 2 |
| E7 | Belief-map debrief | `Debrief.tsx`, `scene/DebriefTableau.tsx` | **three of the four node types are already computed** — see §1.7 | **M** | E5's index | 3 |
| E4 | Tactile tribunal paper ritual | `Tribunal.tsx`, `scene/TribunalChamber.tsx`, `ChoiceButton.tsx` | two-step arm/confirm is procedural gravity in miniature | **M–L** | E8, and an eyeball | 3 |

### 1.1 E8 — Subtitle-grade presentation controls · S–M · Wave 1

**Touches.** `src/scene/BeatStage.tsx`, `src/scene/DepositionBeatStage.tsx`,
`src/styles.css` (`.scene-beat*` families), `src/components/CaseHeader.tsx:46`–`93`,
`src/game/types.ts:69`–`80`, `src/game/persistence.ts:142`–`161`,
`src/game/engine.ts:26`–`32`.

**Already there.** More than the research assumes.
- Manual pacing per line, in absolute ms, is shipped: `beatHoldMs` at
  `src/game/beats.ts:27`–`32` (`1700`/`4500`/`900`/`45` — absolute, not multipliers).
- Speaker indication is shipped as a first-class line kind (`BeatLine` union,
  `src/game/beats.ts:10`–`17`) and rendered with the persona's face
  (`BeatStage.tsx:152`–`154`).
- The AT channel is already separated from the visual stanza: the stanza is
  `aria-hidden` (`BeatStage.tsx:141`) and mirrored line-by-line into one polite live
  region (`BeatStage.tsx:131`–`135`).
- Reduced motion is already *advance-paced*, not timer-paced (`BeatStage.tsx:76`–`82`
  plus the comment at `:11`–`15`) — the recorded prototype-QA scar is already honoured.
- Size scaling exists globally: `html.annex-large-text { font-size: 112.5% }`
  (`styles.css:100`–`102`) and `.scene-beat-line--subject` is authored in a `rem` token
  (`styles.css:9994`–`10000`, now `font-size: var(--type-title)` after `97c8704`), so it
  scales today.

**Genuinely missing, and measurable.**
1. **No line cap.** `advance()` sets `shown = total` (`BeatStage.tsx:62`–`67`), so one
   click or keypress prints the *entire* stanza. The pilot harness proves the real number
   is at least six (`scripts/evidence-pilot-care-ward.mjs:451` asserts
   `flushed.lines.length >= 6`). Xbox XAG-104 says no more than two lines at once in live
   scene text.
2. **No plate behind the text — a halo is doing the whole job.** `.scene-beat-line` carries
   only `text-shadow: 0 2px 18px oklch(0 0 0 / 0.98), 0 0 40px oklch(0 0 0 / 0.9)`
   (`styles.css:9965`–`9971`). This is *exactly* the defect the audit measured and fixed one
   layer down: P1-C, the plate caption at 4.30 : 1 / 2.75 : 1, "a halo is not a scrim"
   (`design-gap-audit-2026-07.md:63`, `:82`). The fix there is the gradient scrim now at
   `styles.css:3323`–`3336` (`.world-caption::before`) — **the model to copy.**
   The `97c8704` pass did **not** touch `.scene-beat-line`'s shadow.
3. **The beat text has never been contrast-measured.** The composited probe's target list
   (`scripts/audit-contrast-probe.mjs:167`–`181`) contains `.world-caption` and
   `.site-closeup-zone-label` but **no `.scene-beat-line` selector**. The audit's "staged
   beat" row (`design-gap-audit-2026-07.md:207`) is the *glyph-area* harness, not the
   contrast one. So the largest narrative text in the game, sitting on a photograph, is
   unmeasured.
4. **Weight 300 — and `97c8704` made this finding stronger, not weaker.** The typography
   pass moved `.scene-beat-line--subject` from `1rem` to `var(--type-title)` = **16.8px**,
   and left `font-weight: 300` in place (`styles.css:9994`–`10000`); `--persona` is 300 at
   `:10037`–`10042`. A larger thin face on a photograph is more swallowed, not less. NN/g's
   dark-mode caution, cited at research `:35`, is exactly this.
5. **No preview of subtitle presentation** (XAG-104 asks for one) and no per-player
   background control.

**Effort S–M.** Typography precondition already met (`97c8704`); depends on the settings-schema decision
(§4.5). Brief: §3.1.

### 1.2 E1 — Scene Mode / Record Mode split · S (E1a) + M (E1b) · Wave 1 / 2

**This is the biggest already-half-exists discovery in the repo: Record Mode is shipped
three times over and has never been named.**

| existing surface | why it is already Record Mode | citation |
|---|---|---|
| **Deposition tray** | portalled out of the shell, `role="dialog" aria-modal`, focus-trapped, docked over an *uncovered* stage, dense sworn statements in `.deposition-statement` | `Deposition.tsx:217`–`239`, `:258`–`283` |
| **Location detail drawer** | "the canonical text surface for a scene-first site: full method prose, the filed record, and the persona reactions" — its own doc comment | `SceneDetailDrawer.tsx:26`–`31`, `:92`–`180` |
| **Case-file drawer** | the rail's only home at every width, four dense panels | `CaseFileDrawer.tsx:106`–`131`, `CaseRail.tsx:91`–`352` |

And the stylesheet **already declares the shared-voice contract in prose**:

> `══ Staged text: ONE family, two stages ══ … The scene beat performing over a plate and
> the deposition transcript's sworn statement are the same act … They therefore share one
> voice, and one voice only lives in one place.`
> — `src/styles.css:9984`–`9993`, binding `.scene-beat-line--subject` and
> `.deposition-statement` into one rule at `:9937`–`9943`.

That comment is Ren'Py's ADV/NVL distinction (research `:33`) written by hand, one half
done. **So E1 is not "build Record Mode." It is "name the three that shipped, and give
Record Mode its own reading typography instead of borrowing Scene Mode's."** That collapses
the research's *Medium* to a genuine **S** for Wave 1.

**E1a (Wave 1).** One `.record-mode` class applied at the three portal boundaries that
*already* compose preference class lists (`Deposition.tsx:205`–`212`,
`SceneDetailDrawer.tsx:79`–`86`, `CaseFileDrawer.tsx:106`–`113`); one documented
reading-typography block using the `--type-read`/`--type-body` tokens from the audit pass;
Scene Mode keeps the plate voice, Record Mode gets reflow, measure, and line-height for
reading. No DOM moves. Brief: §3.2.

**E1b (Wave 2) `[MERGE: audit P1-D]`.** The audit's largest un-built ambience win is
"when a room console is docked, the inspector has no job left; collapse it to a narrow
spine … This is the single largest remaining ambience win at 1280 and it is a layout
decision, not a style one" (`design-gap-audit-2026-07.md:86`–`89`). That is the *same
work item* as E1's second half: the inspector prose is a fourth, non-modal, always-mounted
Record Mode duplicating `SceneDetailDrawer`. Measured at 46.0 % / 58.6 % of the plate
covered by docked chrome at 1280 and 81.3 % at 375 (audit `:52`–`56`) **(reported)**.
Constraint: the always-mounted scar (`annex-investigation-inspector-always-mounted`,
restated at `scene-first-integration-plan.md:18`–`21`) forbids gating canonical text behind
a world-view toggle — so the inspector's prose may only be *retired* where the drawer
provably already carries the identical strings, never merely hidden. **M**, Wave 2.

### 1.3 E6 — Document semantics + Easy Read · SPLIT

The research bundles these (`:99`–`103`). **They should not ship together, and the order
matters.**

**E6a — Easy Read toggle · S · Wave 1.** Precedent is exact: `high-contrast` is a boolean
setting (`types.ts:71`) that becomes a class on `.annex-app` (`App.tsx:277`–`281`), is
re-declared at all three portal boundaries, and drives a dedicated override family
(`styles.css:10968`–`10982` for `.high-contrast .scene-beat-line`/`-lines`, and the forced-opaque
console the audit re-proved at `design-gap-audit-2026-07.md:264`). Easy Read is that shape
with a different override set. Brief: §3.3.

**E6b — Document semantics · M · Wave 2.** Script variation, correction marks, seal
pressure, second-ink insertions. Proto-material exists: `EvidenceStatus` is already a
four-value ink vocabulary (`types.ts:26`) rendered as `.evidence-{status}` chips
(`CaseRail.tsx:242`–`244`), and `DepositionChoiceId` already distinguishes three registers
of intervention (`types.ts:53`). Extending this means **new optional content fields**
(e.g. `EvidenceDefinition.hand?`) and new authored CSS families — content-authoring work
under the additive-only constraint (§4.2).

**The order argument, against the suggested triage.** The brief's Wave 1 listed "document
semantics + Easy Read toggle" as one item. Ship the **escape hatch first, alone**. Easy
Read is the redundancy contract that makes E6b *and* E2 safe to ship at all — the research
says so twice (`:45`, `:63`) and Obsidian shipped the option *because* the styling hindered
legibility. Building stylistic meaning before the flattening path exists means the first
build of E6b has no defined fallback and the second build has to retrofit one.

### 1.4 E2 — Legal weather replacing stance labels · M + L · Wave 2

**Already there — the ambient half is a shipped, generalized system.**
`resolvePreviewTreatment` is a pure resolver over an authored `actionId → token` map, with
resolved-wins-over-preview and unknown-action-to-rest semantics
(`src/scene/previewTreatment.ts:13`–`24`); the token vocabulary is a closed const
(`types.ts:609`–`611`); the authored map hangs off `closeup.previewTreatment`
(`types.ts:663`–`666`) and drives a `data-preview-treatment` attribute consumed in
`Investigation.tsx:1166`–`1168`. Two sibling instances exist (`rainPresence`
`types.ts:670`–`679`; `custodyRail.actionTreatments` `types.ts:427`). The content test
already enforces that every anchored method binds to exactly one token
(`content.test.ts:839`). **The research's "legal weather" is the extension of that closed
token vocabulary from `['listen','pressure']` to a stance vocabulary.** That is a genuinely
small change to a proven system.

**The risky half is the labels.** The stance word is `getTrustLabel(trust)` and it renders
in four places: `CaseRail.tsx:189`–`197`, `CaseRail.tsx:326`–`329`, `Debrief.tsx:201`–`203`,
and the persona signal dot's class at `CaseRail.tsx:180`. That last one is the recorded
class-collision scar: `.trust-committed` / `.trust-open` / `.trust-guarded` /
`.trust-opposed` are the **dot's `background` fill**, and reusing them on a word paints a
block behind it that no text assertion can see (`hud-collapse-report.md:52`–`59`
**(reported)**; the fix shipped as `data-stance`, `CaseRail.tsx:326`).

**The chorus is a content-scope question, not an engineering one.** A Disco-Elysium-style
internal chorus (research `:13`, `:45`) means authored lines per voice × per stance × per
moment. → Open Question 1.

**`[MERGE: audit P2-F]`.** The audit's still-open comprehension finding — "state is named,
purpose is not," heuristic #10 unmoved at 2/10 since 2026-07-19
(`design-gap-audit-2026-07.md:110`–`117`) — is the *plain-language half of the same
problem* the research states as "labels should confirm an inference, not be the inference"
(research `:61`). They merge. But the audit's four sketched lines are cheap, high-payoff,
and are exactly the plain descriptors Easy Read must fall back to — so **the copy half is
pulled forward to Wave 1** (§3.4) and the label-replacement half stays in Wave 2.

### 1.5 E5 — Searchable case file · M · Wave 2

Four panels are built (`CaseRail.tsx:96`–`352`). What is missing is a **text index** over
`state.events`, `evidenceDefinitions`, `fragments`, and `personaRunLines`. The pattern to
copy is already in the tree: `src/game/personaRecord.ts` is a pure persona-major transpose
of the event log, unit-tested in the `fieldCta`/`beats` discipline
(`hud-collapse-report.md:34` **(reported)**; module exists and is consumed at
`CaseRail.tsx:315`).

**Recommendation: the query trail is view-local state, never persisted.** Persisting it
would be a save-schema change for a fiction flourish, against §4.1. The trail is still
"part of the fiction" within a session, which is where the player is doing the thinking.

### 1.6 E3 — Ledger + structured filings · M · Wave 2 (after E5)

**Already there.** The Golden-Idol "structured filing" verb is shipped twice:
- `Reconstruction.tsx:59`–`145` — pick exactly two anchors, irreversible for the run, two-step
  arm with three silent disarm gestures (`:34`–`49`), an sr-only arm announcement (`:128`–`130`),
  and a content test proving every pairing yields a distinct model (`content.test.ts:157`,
  `:171`).
- The classification room — cards into a statute's categories, discovering the category the
  statute cannot hold, entirely view-local with the reducer never learning it exists
  (`types.ts:279`–`283` doc comment; `ClassificationRoom.tsx`).

What is missing is the *book*: chronology binding event → evidence → persona line → filing.
That is one more transpose over the same index E5 builds.

**Sequencing challenge to the suggested triage.** The brief listed Wave 2 as
"legal-weather; ledger/structured filings; searchable case file." Dependencies say
**E5 → E3 → E6b → E2**. E5's deliverable *is* the index; E3 is a second view onto it;
building E3 first means building the index twice or building the ledger without one. And
E2 goes last in the wave because its non-personified expression **is** document semantics
(research `:45` says so explicitly) — E6b is E2's substrate.

### 1.7 E7 — Belief-map debrief · M · Wave 3

**Already there — three of the four node types are computed today**, and rendered as
stacked prose:
- **Counterfactual nodes.** `refusalNoteForSite` picks, for each visited site, the sibling
  action the auditor did *not* take and reads its `counterfactualNote`
  (`Debrief.tsx:32`–`43`, rendered `:174`–`181`). Every action is required to author one
  (`content.test.ts:184`).
- **Contradiction edges.** `getTensionLine(caseId, reconstruction, decision)` is a
  filed-model × finding tension line (`Debrief.tsx:58`–`61`, `:118`–`122`), with a content
  test asserting a nonempty line for **every** model × decision pair
  (`content.test.ts:465`).
- **The anomaly node the research names by name.** `revelation` — "What the fourth minute
  held" (`Debrief.tsx:64`, `:125`–`133`). Research `:49` asks for "'fourth minute' anomalies"
  in a belief chain. The content already is one.

So the accessible linear-outline equivalent the research demands (`:49`) is **what exists
today** — meaning the network is purely additive and the fallback is free. That is an
unusually favourable risk profile for an L-looking feature.

**Counter-argument for Wave 3 anyway.** The debrief is one of the two screens the user did
*not* complain about, and is measurably the best hierarchy in the game: 14 → 7 distinct
sizes, 6.2 : 1 size range, 11.8 % glyph area *and* it reads as calm
(`design-gap-audit-2026-07.md:32`–`34` **(reported)**). Restructuring the one working
screen before the broken ones are fixed inverts the payoff order.

### 1.8 E4 — Tactile tribunal ritual · M–L · Wave 3, last

**Already there.** `ChoiceButton`'s `requiresConfirmation` two-step is used on every
tribunal finding (`Tribunal.tsx:105`) — arm, then ratify — which is procedural gravity in
miniature, plus `.button-armed` and the sr-only arm announcement (`Reconstruction.tsx:128`).
`TribunalChamber` already carries a seal, channel, headline and precedent line as authored
chrome (`Tribunal.tsx:31`–`42`; `CaseChrome` at `types.ts:760`–`777`).

**Why it goes last, argued from the code and the measurements.**
1. It is the repo's **first drag interaction**. There is no drag precedent anywhere in
   `src/`, and the research's own accessibility note requires a full keyboard/form-mode
   equivalent (`:47`) — i.e. two complete input paths for one ritual.
2. It lands on a surface with **≥ 2 positioned controls**, which triggers the recorded
   cross-zone sweep rule that already caught a real 432-px-of-controls-in-a-375-px-row bug
   (`hud-collapse-report.md:137`–`151` **(reported)**; memory
   `annex-review-scar-cross-zone-hits`). A drag surface multiplies that sweep.
3. The tribunal is a once-per-run screen and one of the two the audit found already has a
   real display step and drew no complaint (`design-gap-audit-2026-07.md:34`).

Highest verification cost, lowest measured need. **Last.**

---

## 2. Wave triage

### Wave 1 — polish the shipped shape
Low structural risk, high readability payoff. **All four items land in the same three
files** (`styles.css`, the settings schema, the three portal boundaries), so shipping them
as one change means **one save-schema risk event instead of three**.

| item | source | effort | brief |
|---|---|---|---|
| W1-1 · Subtitle-grade presentation controls | E8 | S–M | §3.1 |
| W1-2 · Record Mode, named and typed | E1a `[MERGE: audit P3-A]` | S | §3.2 |
| W1-3 · Easy Read toggle | E6a | S | §3.3 |
| W1-4 · Purpose copy (writer-gated) | `[MERGE: audit P2-F, P3-B, P3-C]` | S | §3.4 |

### Wave 2 — systems become fiction
`E5 → E3 → E6b → E2`, plus the structural audit items that are the same work.

| item | source | effort |
|---|---|---|
| W2-1 · One pure index over events/evidence/fragments/persona lines; search + query trail (view-local) | E5 | M |
| W2-2 · Ledger: chronology view + structured filing grammar generalized | E3 | M |
| W2-3 · Inspector collapse — retire the fourth Record Mode | E1b `[MERGE: audit P1-D]` | M |
| W2-4 · Mobile record sheet with a peek state | `[MERGE: audit P2-E]` | M |
| W2-5 · Document semantics (ink, hand, correction, seal) | E6b | M |
| W2-6 · Legal-weather token vocabulary + stance-label replacement | E2 | M |
| W2-7 · Site name appears three times on the concourse | `[MERGE: audit P1-E]` | S |

### Wave 3 — new rituals
| item | source | effort |
|---|---|---|
| W3-1 · Belief-map debrief (network added over the existing prose outline) | E7 | M |
| W3-2 · Tactile tribunal verdict | E4 | M–L |

### Where I disagree with the suggested triage, and why

1. **"Document semantics + Easy Read" is split, and the toggle ships first, alone.**
   Easy Read is the redundancy contract the research requires for *both* E6b and E2
   (`:45`, `:63`). Ship the escape hatch before the thing it escapes, or the first build of
   document semantics has no defined fallback.
2. **"The Scene/Record split" is re-scoped from build to normalize.** Three Record Modes
   already ship (§1.2) and the stylesheet already argues for one shared voice at
   `styles.css:9984`. Wave 1 names them and gives Record Mode its own reading typography —
   class and token work only, no DOM moves. The *structural* half (retiring the inspector's
   duplicate prose = audit P1-D) is real layout risk and moves to Wave 2.
3. **Wave 2 is reordered to `E5 → E3 → E6b → E2`, not "legal weather first."** E5's
   deliverable is the index E3 consumes; E6b is literally E2's non-personified expression
   (research `:45`). Building E2 first means authoring stance styling with no document
   grammar to express it in.
4. **Wave 3 is reordered: belief map before tribunal ritual.** E7 adds a network over three
   derivations that already exist (`refusalNoteForSite`, `getTensionLine`, `getRevelation`)
   and its accessible linear fallback is the *current* screen, so it comes free. E4
   introduces the repo's first drag interaction, needs two complete input paths, lands on
   the surface governed by the cross-zone sweep scar, and targets a screen the audit
   measured as already working.
5. **One audit item is pulled *into* Wave 1 that the brief did not list: P2-F.** It is
   copy-only, it is the audit's only finding unmoved since 2026-07-19, and Easy Read needs
   plain descriptors to fall back to — W1-3 is weaker without it. Gated on the writer
   (§3.4, Open Question 1).

---

## 3. Wave 1 implementation briefs

Each brief is self-contained: a builder with no access to this conversation can act on it.
**Every brief inherits §4 in full.**

**Shared precondition for all four — SATISFIED at `97c8704`.** The audit's typography pass
must be committed before Wave 1 starts, because W1-1 and W1-2 both consume `--type-read`,
`--type-body`, `--type-title` and `--label-weight`, and re-deriving them would re-open the
audit's 58-font-size finding. Re-verify before starting, in case of a rebase:
`git show HEAD:src/styles.css | grep -c -- '--type-label'` → must be ≥ 1 (currently **45**).

**Also re-baseline before starting.** The `97c8704` numbers in
`design-gap-audit-2026-07.md:200`–`224` are the audit author's, not yours. Run
`scripts/audit-design-gap.mjs` and `scripts/audit-contrast-probe.mjs` once against
`97c8704` and treat *that* output as the Wave-1 "before" — a before/after comparison against
a number quoted from a document is not a measurement.

**Shared gate for all four.** After any edit to `src/styles.css`, run
`npx vite build` **before** running any harness. Recorded scar: a malformed CSS comment
shipped a stylesheet that failed PostCSS while `tsc`, `eslint` and `vitest` all stayed
green (`design-gap-audit-2026-07.md:276`).

---

### 3.1 W1-1 — Subtitle-grade presentation controls

**Problem.** The largest narrative text in the game — the staged beat over the plate — has
(a) no cap on simultaneous lines, (b) no background behind it but a `text-shadow` halo,
(c) a 300 font-weight on a photograph, and (d) has never been composited-contrast measured.
(b) is the same defect class the audit found and fixed one layer down for `.world-caption`
(P1-C, 4.30 : 1 and 2.75 : 1, `design-gap-audit-2026-07.md:82`–`84`).

**Files.**
- `src/scene/BeatStage.tsx` — the visual window (see the load-bearing design note below).
- `src/scene/DepositionBeatStage.tsx` — the sibling stage; must not diverge.
- `src/styles.css` — `.scene-beat-lines` (committed `:9885`–`9901`), `.scene-beat-line`
  (`:9909`–`9915`), `.scene-beat-line--subject` (`:9937`–`9943`), `.scene-beat-line--persona`
  (`:10037`–`10042`); new `.scene-beat-lines::before` scrim modelled on the audit's
  `.world-caption::before` (audit `:187`).
- `src/game/types.ts:69`–`80`, `src/game/engine.ts:26`–`32`,
  `src/game/persistence.ts:142`–`161`, `src/components/CaseHeader.tsx:46`–`93` — one new
  boolean setting, `subtitlePlate` (see §4.5 for the schema rules; **do not** invent a
  non-boolean setting and **do not** extend the `textSize` union).
- Three portal boundaries — `Deposition.tsx:205`–`212`, `SceneDetailDrawer.tsx:79`–`86`,
  `CaseFileDrawer.tsx:106`–`113` — must each gain the new preference class, or the
  preference silently fails on every portalled surface.
- `scripts/audit-contrast-probe.mjs:167`–`181` — **add** targets; do not remove any.
- `src/game/persistence.test.ts` — new decode cases.

**LOAD-BEARING DESIGN NOTE — implement the two-line cap as a *visual* window, never by
unmounting lines.** Three shipped harness assertions count `.scene-beat-line` **DOM nodes**
and require `>= 6`:
- `scripts/evidence-pilot-care-ward.mjs:451` — "a keypress flushes the stanza"
- `scripts/evidence-pilot-care-ward.mjs:472`–`473` — "the result strip docks with the stanza
  held above it" (`beatLinesStillVisible >= 6`)
- `scripts/evidence-pilot-care-ward.mjs:738`–`740` — reduced motion: `rmBeat.lines >= 6`

Unmounting lines would break all three, and "weaken the assertion" is a banned resolution.
Keep every revealed line mounted (AT already reads them all through the live region,
`BeatStage.tsx:131`–`135`); constrain what is **painted** — the container already has
`max-height: 62%`, `overflow: hidden` and a `mask-image` (`styles.css:9942`–`9960`),
so the window is a computed `max-height` of *N* line boxes plus gaps, not a mount change.
**Result: zero harness assertions edited.**

**Reduced motion and Easy Read are exempt from the window.** Under reduced motion every
line renders at once and nothing auto-advances (`BeatStage.tsx:11`–`15`, `:76`–`82`); a
2-line visual window there would hide four lines from a player who has no way to advance
past them. The window applies only when reduced motion is OFF and Easy Read is OFF.

**Acceptance criteria — absolute, third-party falsifiable.**

*Scene Mode line discipline (1280×800 and 375×812, Case 77 Care Ward pilot):*
1. With reduced motion OFF: at every advance step, the number of `.scene-beat-line`
   elements whose **border box lies fully inside** `.scene-beat-lines`' content box is
   **≤ 2**. Node count is unchanged and still ≥ 6 after a flush.
2. With reduced motion ON: **all** `.scene-beat-line` boxes lie fully inside the content
   box — no line is clipped. *(This is also a live check on an existing latent bug: today's
   `max-height: 62%` may already clip a 6-line stanza at 375×812. Report the pre-change
   number.)*

*Contrast (composited, via `scripts/audit-contrast-probe.mjs`):*
3. `.scene-beat-line--subject` and `.scene-beat-line--persona` are added to the probe's
   `TARGETS` list and both measure **≥ 4.5 : 1** at 1280×800 and 375×812, with the plate
   at rest **and** under each authored `data-preview-treatment` state
   (`listen`, `pressure` — `types.ts:609`). Report the worst pixel per state.
4. The pre-change value for the same selectors is measured and recorded first, on the
   unmodified build. If the pre-change value already passes, say so and lower the claim —
   do not report a fix for a defect that was not reproduced.

*Weight and size:*
5. `.scene-beat-line--subject` computed `font-weight` ≥ **400** at both viewports.
   `.scene-beat-line--persona` likewise.
6. With `textSize: 'large'`, `.scene-beat-line--subject` computed `font-size` is
   **≥ 112.5 %** of its standard value at both viewports, and criterion 1 still holds
   (a larger face must not push a third line into view).

*The new control:*
7. The Access popover shows **exactly 7 checkboxes** in authored order, the two new ones
   last (`CaseHeader.tsx:46`–`93`). Each has a ≥ 44×44 px hit area.
8. Toggling `subtitlePlate` ON puts a scrim behind the stanza measured as: the composited
   background luminance behind the glyph boxes changes, and criterion 3's ratio **rises**.
   Toggling OFF returns it to the pre-change value.
9. **Preview requirement (XAG-104).** The Access popover renders a live sample line
   styled by the current subtitle settings, present in the DOM whenever the popover is
   open, at every phase. Its text is new authored copy (§4.3).
10. The preference survives a reload: set it, reload, assert it is still set — and assert
    that a **v2 save written by the pre-change build still loads** (§4.5, criterion 4.5-c).

*Cross-surface:*
11. `.deposition-statement` is unchanged in *voice* (it shares the rule at
    `styles.css:9994`–`10000`) — if W1-1 changes that shared rule, the deposition stage is
    re-measured too. State which stage each change belongs to; the shared comment at
    `styles.css:9984`–`9993` is the contract.

**Verification method.**
- Add a probe run: `node scripts/audit-contrast-probe.mjs` before and after, on the same
  commit, with `git stash` for the "before" — the method the audit already used and
  documented (`design-gap-audit-2026-07.md:245`).
- Line-box geometry via a CDP evaluate that reads `getBoundingClientRect()` on each
  `.scene-beat-line` and on `.scene-beat-lines`, **with transitions and animations disabled
  and two frames allowed to pass** (recorded transition-clock scar, memory
  `annex-transition-clock-measurement`; the freeze snippet is
  `scripts/audit-contrast-probe.mjs:158`–`164`). Note the harness bug already recorded:
  `animation: none !important` strands entry animations, so settle ~460 ms after lifting the
  freeze before capturing (`hud-collapse-report.md:240`–`243`).
- All interactions via `el.click()` or trusted CDP input, never `dispatchEvent` (memory
  `annex-preview-pane-quirks`).
- Re-run all four harnesses (§4.6) and report pass counts.

**Harness impact.** Expected: **zero assertions edited**, four harnesses unchanged, and
`scripts/audit-contrast-probe.mjs` gains two targets (additive). If any assertion *must*
change, stop and escalate rather than editing it.

---

### 3.2 W1-2 — Record Mode, named and typed

**Problem.** Three record surfaces ship today and all three borrow Scene Mode's typography.
The stylesheet already argues they are one voice with two stages
(`styles.css:9984`–`9993`) but only the *scene* stage was ever authored.

**Files.**
- `src/components/Deposition.tsx:205`–`212`, `src/components/SceneDetailDrawer.tsx:79`–`86`,
  `src/components/CaseFileDrawer.tsx:106`–`113` — each already builds a preference class
  list; each gains `'record-mode'` as a constant member.
- `src/styles.css` — one new documented `.record-mode` reading block, consuming
  `--type-read` / `--type-body` / `--label-weight` from the audit pass. No new size tokens.

**Explicit non-goals.** No DOM moves. No new class names beyond the `.record-mode` family.
The inspector is **not** touched (that is W2-3). No content strings change.

**Acceptance criteria.**
1. `document.querySelectorAll('.record-mode').length === 1` when exactly one record surface
   is open, `0` at rest, and never `2` — mutual exclusivity is already enforced twice
   (`hud-collapse-report.md:91`–`104` **(reported)**); this asserts the class inherits it.
2. Inside `.record-mode`, body prose (`.deposition-statement`, `.scene-detail-description`,
   `.scene-detail-method p`, `.rail-panel p`) computes to a measure of **45–80 characters
   per line** at 1280×800, measured as rendered line-box width ÷ mean glyph advance.
3. `line-height` for that prose is **≥ 1.5** in Record Mode (it is `1.45` today on the
   shared rule, `styles.css:9999`) and Scene Mode's stanza line-height is
   **unchanged**.
4. **No new `font-size` literal is introduced.** `git diff src/styles.css | grep -c
   'font-size: [0-9]'` on added lines must be **0** — every size is a `var(--type-*)`.
   This is the audit's P3-A guardrail: "a token nobody can point at a screen for is a lie"
   (`design-gap-audit-2026-07.md:120`).
5. Distinct-font-size count on the case-file-drawer surface at 1280×800, via
   `scripts/audit-design-gap.mjs`, does **not rise** from its post-typography-pass value
   (the audit reports 8; re-measure rather than trusting the number).
6. Composited contrast for every text style inside `.record-mode` is **≥ 4.5 : 1**, at both
   viewports, measured with the same probe.
7. Under `high-contrast`, `reduce-motion` and `large-text`, `.record-mode` composes
   correctly at all three portals — assert all four classes present simultaneously on the
   portal root when all four preferences are on.

**Verification.** `scripts/audit-design-gap.mjs` and `scripts/audit-contrast-probe.mjs`
before/after on the same commit; all four harnesses re-run.

**Harness impact.** Expected zero. `evidence-persona-portraits.mjs` reaches the rail
through `openCaseFileCaseTab()` (`hud-collapse-report.md:288`–`296` **(reported)**) and does
not read typography; `evidence-hud-collapse.mjs` asserts structure and focus order.

---

### 3.3 W1-3 — Easy Read toggle

**Problem.** The research's fourth failure mode is "stylized text without an accessibility
escape hatch" (`:63`). Wave 2 is about to add stylistic meaning to documents (E6b) and to
stance (E2). The flattening path must exist first.

**Files.** Same schema files as W1-1 (`types.ts`, `engine.ts` defaults, `persistence.ts`
decode, `CaseHeader.tsx`), the three portal boundaries, `App.tsx:277`–`281`, and one
`styles.css` override family modelled on the shipped `high-contrast` family.

**What Easy Read does in Wave 1** (a real, testable payload — not a no-op placeholder):
- Scene Mode: the subtitle visual window is lifted (all revealed lines shown), the
  `text-shadow` halo is replaced by the opaque plate regardless of `subtitlePlate`, and
  every decorative letter-spacing on narrative text returns to normal.
- Record Mode: `letter-spacing` on caps-mono labels returns to `0.02em`, `text-transform:
  uppercase` on *narrative* labels is removed (system codes may keep it), and any
  `font-style: italic` on multi-line prose is removed.
- Global: `.scene-beat-hint`'s infinite fade is suppressed (already suppressed under
  reduced motion, `styles.css:10914`) — Easy Read joins that rule.

**Acceptance criteria.**
1. The setting is a **boolean** named `easyRead`, defaulting to `false`, decoded
   optional-tolerated per §4.5.
2. Toggling it adds `easy-read` to `.annex-app` **and** to all three portal roots. Assert
   `document.querySelectorAll('.easy-read').length` is 1 at rest and 2 with a record surface
   open.
3. With Easy Read ON at 1280×800 and 375×812: **zero** elements inside `.annex-app` or any
   portal root compute `text-transform: uppercase` **and** `letter-spacing > 0.06em`
   **and** contain more than 4 words. (Bounded, falsifiable, and it targets exactly the
   Pentiment failure without banning system codes.)
4. With Easy Read ON, `.scene-beat-line` computed `text-shadow` is `none` and the stanza
   scrim's computed background alpha is ≥ 0.80.
5. With Easy Read ON, every element that was visible with it OFF is still visible — no
   content is removed, only styling flattened. Verify by text-content diff of
   `document.body.innerText` between the two states: the set difference must be empty.
6. Contrast with Easy Read ON is **≥ 7 : 1** on all narrative prose (a stricter floor is
   the point of the mode), at both viewports.
7. Easy Read composes with all four existing preference classes without any rule using
   `!important` to win — assert by reading computed values, not by reading the cascade.

**Verification.** Contrast probe with the class forced on; a DOM sweep for criterion 3; all
four harnesses; `npx vite build`.

**Harness impact.** Expected zero (the mode is off by default, and no harness sets it).

---

### 3.4 W1-4 — Purpose copy `[MERGE: audit P2-F + P3-B + P3-C]` · WRITER-GATED

**Problem.** The audit's heuristic-#10 finding is the only one unmoved since 2026-07-19:
`0 / 2 · SITES` and `Needed · MODEL` name a state without naming a purpose; nothing says
why the case file is worth opening or what a stance commits you to
(`design-gap-audit-2026-07.md:110`–`117`). The research states the same rule from the other
side: "Labels should confirm an inference, not be the inference" (`:61`).

**This item is engineering-ready but copy-blocked.** The audit sketched four lines
(`:113`–`116`); they are the writer's to ratify or replace. → Open Question 1.

**Files.** `src/components/Investigation.tsx:1028`–`1064` (the objectives strip and
threshold line), `src/components/CaseFileDrawer.tsx:23`–`40` (`CaseFileSummon`'s preview
text), **`src/scene/TribunalChamber.tsx:58`** — this is the P3-C string, located:
`<span>{evidenceCount} admitted signals</span>`, with no singular branch, so it renders
`1 admitted signals`. (Note that `Tribunal.tsx:118`–`121` composes a *different*
admitted-items line and **already** agrees correctly at 1 — do not "fix" that one.) Plus
the authored strings in `src/game/cases/case77.ts` / `case81.ts` for P3-B.

**Acceptance criteria — structural, so they hold whatever the final wording is.**
1. Each line appears **once**, at the moment it becomes true, and never again in that run.
   Assert: the string is absent before the trigger, present in the frame after it, and
   absent after the next phase change.
2. **No line is a tutorial overlay, a modal, or a dismissible tip.** Assert: each new string
   is a child of an element that already existed pre-change; `git diff` introduces no new
   `role="dialog"`.
3. Total glyph area on the 1280×800 concourse rises by **≤ 1.0 pp** over its
   post-typography-pass value, measured by `scripts/audit-design-gap.mjs`. (The audit's
   whole finding is that variety, not volume, is the problem — but a purpose line is still
   ink, and it must be budgeted.)
4. Distinct font sizes on that surface does **not** rise (the copy uses existing roles).
5. Every new string uses curly punctuation (`’ “ ” —`), matching the shipped voice — grep
   the diff for `'` and `"` inside added string literals: must be 0.
6. The content string-walk test still passes: new authored strings on case bundles must be
   reachable by the recursive walk (`src/game/content.test.ts`, the "surfaces … to the
   string-walk" family, e.g. `:928`, `:960`).
7. P3-C: assert the tribunal admitted-signal line reads correctly at 0, 1 and 2+ items
   (seed all three states).

**Verification.** `scripts/audit-design-gap.mjs` before/after; `npx vitest run`
(content tests); the four harnesses; screenshots at both viewports for the user's eye
(criterion 3 is a number, but "does this read as help or as noise" is taste — §4.7).

---

## 4. Constraints every item must comply with

### 4.1 Reducer and persistence
The reducer's game logic is **untouched**. `BeatStage` and every record surface are
presentational and fire *after* dispatch — the hard rule from
`scene-first-integration-plan.md:191`–`193` ("commit first, then reveal") holds for
everything in this roadmap. Rooms, deposition and classification are already view-local by
construction (`types.ts:279`–`283`).

**The one exception is the settings schema, and it is not free — see §4.5.**

### 4.2 Content fields are additive-only
New content is an **optional** field on an existing definition, never a required one and
never a rename. The precedent to cite is `FieldActionDefinition.beat?`
(`types.ts:238`–`242`, `:279`–`281`): "Static content only — field-action definitions are
never part of persisted `GameState`, so this field needs no save migration." Any new
authored strings must be reachable by the recursive content string-walk
(`content.test.ts`, e.g. `:928`, `:960`, `:876`), and any new closed vocabulary must be a
`const` tuple with a content test asserting every authored value is a member — the pattern
at `types.ts:609`–`611` + `content.test.ts:839`.

### 4.3 Narrative strings are sacred
Staging may change; words may not. Existing strings in `src/game/cases/*.ts` are moved,
re-homed and re-styled freely — never re-worded. New authored copy is permitted only where
a brief names it (W1-1 criterion 9's preview sample; W1-4's purpose lines), must be
in-voice, and must use curly punctuation. The **content-id-leak grep** is a required review
step (memory `annex-campaign-decisions`): no component may name a case's location, action
or decision id.

### 4.4 DOM is canonical for assistive tech — with the recorded scars
- **Cross-zone sweep.** Any surface gaining a second positioned interactive control gets a
  pairwise box-intersection test plus an `elementFromPoint` check at each control's visual
  centre, at 1280×800 **and** 375×812. Per-zone verification is blind to control-pair
  interference (memory `annex-review-scar-cross-zone-hits`); this rule caught a real bug at
  375 (`hud-collapse-report.md:145`–`151` **(reported)**).
- **Class-collision grep.** Every new class name is grepped against `src/styles.css` and
  all `src/**/*.tsx` before use, expecting 0 pre-existing occurrences. A collision is
  invisible to every text assertion (`hud-collapse-report.md:52`–`63` **(reported)**;
  memory `annex-prototype-qa-scars`).
- **No `opacity` + `animation-fill-mode: both` for reveals.** Carry reveals via `clip-path`
  or `transform`, with the *resting* style being the fully visible one — the shipped
  `scene-beat-line-in` keyframe is the model (`styles.css:9973`–`9983`) and the
  comment at `BeatStage.tsx:136`–`140` states the contract. Memory
  `annex-scene-opacity-strand`.
- **Reduced motion is advance-paced, never timer-paced** (`BeatStage.tsx:11`–`15`).
- **Computed-style probes disable transitions AND animations and let two frames pass**
  before reading (memory `annex-transition-clock-measurement`; snippet at
  `scripts/audit-contrast-probe.mjs:158`–`164`), then settle ~460 ms after lifting the
  freeze before screenshotting (`hud-collapse-report.md:240`–`243`).
- **oklch is resolved by the renderer, not by string maths**, and only glyph line boxes are
  sampled, with occluded text skipped (`design-gap-audit-2026-07.md:247`, `:278`).
- Interactions in any harness use `el.click()` or trusted CDP input, never `dispatchEvent`
  (memory `annex-preview-pane-quirks`).

### 4.5 The settings schema — honest save-risk assessment
**Settings are persisted twice**, and this is the part that is easy to get wrong.
1. Standalone, under `the-annex.accessibility.v1` (`persistence.ts:22`, written at `:441`
   from `App.tsx:205`–`207`).
2. **Inside the game save**, as `GameState.settings` (`types.ts:106`, written by `saveGame`
   at `App.tsx:200`–`203`).

And `decodeGameState` **rejects the entire save** if the settings blob fails to decode:
`const settings = decodeAccessibilitySettings(value.settings); if (!settings || …) return null`
(`persistence.ts:355`–`356`). So a **strictly-required** new field would make every existing
save undecodable — `loadGame()` returns `null` and the player loses `precedents`,
`previousRuns` and `runNumber`. That is a full wipe, which is exactly the harness-§3 scar
("an additive field once wiped saves via a checksum gate").

**The mandated pattern is `ambientSound`'s**, which exists precisely as this precedent
(`types.ts:74`–`79`, `persistence.ts:150`–`152`, `:159`):

```ts
if (value.easyRead !== undefined && typeof value.easyRead !== 'boolean') return null
// …
easyRead: value.easyRead ?? false,
```

Absent tolerates to the default; present-but-malformed still rejects, matching the strict
treatment every other field gets.

**Consequences, stated honestly:**
- **a.** With that pattern: **no `CURRENT_SAVE_SCHEMA` bump** (`persistence.ts:28`), **no
  `saveMigrations` entry** (`:240`), **no wipe risk**. This is the recommendation.
- **b.** The **reducer's `UPDATE_SETTING` branch is genuinely untouched.** Its `else` arm
  assigns any boolean generically — `settings[action.setting] = action.value`
  (`engine.ts:545`–`551`). This is why both new settings **must be booleans**. A
  three-state control (e.g. subtitle background none/scrim/plate) would force widening the
  `GameAction` value union (`types.ts:172`) and adding a reducer branch. **Do not do it in
  Wave 1.**
- **c.** `defaultAccessibilitySettings` (`engine.ts:26`–`32`) gains two `false` entries.
  `keyof AccessibilitySettings` widens automatically through `CaseHeader`'s prop type
  (`CaseHeader.tsx:7`–`10`) and `App.tsx:229`–`234`.
- **d.** **Do not extend the `textSize` union.** `persistence.ts:146` rejects any value
  that is not `'standard' | 'large'`, so a save written by a new build carrying
  `textSize: 'x-large'` would be **rejected wholesale by an older build** — a downgrade
  wipe. Subtitle size rides the existing `textSize` axis in Wave 1.
- **e.** Forward-compat in the other direction is safe: `decodeAccessibilitySettings`
  constructs a fresh object from known keys (`:154`–`160`), so an old build reading a new
  save silently drops the two new fields rather than rejecting.
- **f.** **Required verification.** Write a v2 save with the **pre-change build**, then load
  it with the post-change build and assert `loadGame()` returns non-null with
  `precedents`, `previousRuns` and `runNumber` intact. Reading the decode function is not
  evidence; the round trip is. Add cases to `src/game/persistence.test.ts`.

**Toggle count: 5 today → 7 after Wave 1.** Existing five at `CaseHeader.tsx:50`–`91`:
Reduce motion, High contrast, Larger text, Show trust values, Ambient sound. New two:
**Easy Read**, **Subtitle plate**. Both boolean, both default `false`, both appended last.

### 4.6 The four evidence harnesses stay runnable
`scripts/evidence-hud-collapse.mjs` (123 checks), `scripts/evidence-rooms-scene-first.mjs`
(110), `scripts/evidence-pilot-care-ward.mjs` (52 + 1 documented seed-save skip),
`scripts/evidence-persona-portraits.mjs` (37) — the set the audit re-ran green
(`design-gap-audit-2026-07.md:257`–`260` **(reported)**). Every item re-runs all four and
reports counts. **Zero assertions may be deleted, weakened or re-baselined.** If an item
appears to require an edit, that is an escalation, not a task — see the specific trap at
§3.1 (three assertions count `.scene-beat-line` nodes and require `>= 6`).

Gates before any harness run: `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint .`,
`npx vitest run`, and — mandatory after any `styles.css` edit — `npx vite build`
(`design-gap-audit-2026-07.md:276`).

### 4.7 Feel closes on an eyeball, never on a number
Every Wave-1 item produces before/after screenshot pairs at 1280×800 and 375×812. The
numbers above are the *floor*; whether the scene now reads as dominant enough is the user's
call, exactly as the audit left it (`design-gap-audit-2026-07.md:268`). No item is
"done" on measurements alone.

---

## 5. Risks — top five, with detection

**R1 · The subtitle window is implemented by unmounting lines, silently breaking three
harness assertions — and the fix is to weaken them.**
Three checks count `.scene-beat-line` DOM nodes and require `>= 6`
(`evidence-pilot-care-ward.mjs:451`, `:472`, `:738`). The tempting resolution is to relax
them, which destroys the record of what the beat is supposed to do.
**Detection:** run `scripts/evidence-pilot-care-ward.mjs` *before* touching `BeatStage.tsx`
and record 52/1; review `git diff scripts/` and require it to be **empty** for all four
harnesses. Any non-empty diff is a REQUEST CHANGES.

**R2 · The settings change wipes saves, and the only "evidence" offered is that decode was
read.**
`decodeGameState` rejects the whole save on a settings failure (`persistence.ts:355`–`356`),
so a required field costs `precedents` + `previousRuns` + `runNumber`. Reading the
optional-tolerated pattern is not proof it was applied.
**Detection:** the round trip at §4.5-f — a save produced by the **pre-change** build, loaded
by the post-change build, asserted non-null with fields intact. Plus: `git diff
src/game/persistence.ts` must show `CURRENT_SAVE_SCHEMA` **unchanged at 2** and no new
`saveMigrations` entry.

**R3 · A preference is added to `.annex-app` but not to the three portal roots, so it
silently fails on exactly the surfaces it exists for.**
`Deposition.tsx:205`, `SceneDetailDrawer.tsx:79` and `CaseFileDrawer.tsx:106` each rebuild
the preference class list by hand. Easy Read is *for* record surfaces; a missed portal makes
it a no-op where it matters and every text assertion still passes.
**Detection:** with all preferences on and a record surface open, assert
`document.querySelectorAll('.easy-read').length === 2` and that all four preference classes
are present on the portal root. Also: `grep -c "high-contrast" src/components/*.tsx` should
return the same file set as the new class.

**R4 · A contrast "fix" that never reproduced the defect.**
W1-1's premise is that the beat text fails AA on the photograph. It has never been measured
(`audit-contrast-probe.mjs:167`–`181` has no `.scene-beat-line` target). If the pre-change
value already passes, the whole item's framing is wrong and the plate is a taste change, not
a fix.
**Detection:** measure the pre-change value **first**, on the unmodified build, at both
viewports and under both `data-preview-treatment` states. If it passes, say so, lower the
claim, and re-scope. "The premise doesn't hold" is a complete verdict.

**R5 · New Wave-1 rules are beaten in the cascade by the typography pass they were written
against — and a doc-quoted baseline hides it.** *(Downgraded from the drafting-time risk:
the pass landed at `97c8704`, so the "two concurrent passes on one 11 000-line file" hazard
is closed. What survives is the cascade half, and one new hazard.)*
Wave 1 injects `.record-mode` and `.scene-beat*` rules into containers the `97c8704` pass
just re-authored; new CSS in existing containers can lose to source-order rules — the
recorded precedent at `scene-first-integration-plan.md:275`–`281`. The new hazard is
subtler: `97c8704` snapped **232 declarations** onto seven tokens
(`design-gap-audit-2026-07.md:172`), so a Wave-1 rule that changes a *token* moves surfaces
nobody in Wave 1 is looking at.
**Detection:** (a) every style claim verified by reading **computed** values at runtime,
never the authored rule, with transitions and animations disabled (§4.4); (b) `git diff`
must show **zero** changes to any `--type-*` or `--label-*` token — Wave 1 may add rules,
never retune the shared band; (c) the §3 re-baseline — run both audit scripts against
`97c8704` yourself rather than comparing to numbers quoted in a document.

---

## 6. Open questions for the user

**Q1 · How literal may the internal chorus get?** *(Changes authored-content scope by an
order of magnitude, and gates both W1-4 and W2-6.)*
The research's single highest-leverage suggestion is Disco Elysium's voiced skills — a small
chorus (Clerk, Ghost, Statute, Mercy, Precedent) that interrupts and colours a line instead
of a stance label (`ui-patterns-deep-research.md:13`, `:45`). Three positions:
- **(a) Literal chorus.** Named interior voices with their own register, speaking over
  choices. Cost: a line per voice × per stance × per moment — the largest content commitment
  in this roadmap, and a real tonal risk: The Annex's four personas are *external* people
  with recorded standing (`personaRecord.ts`, `CaseRail.tsx:307`–`352`), and adding interior
  voices doubles the cast.
- **(b) Document-only.** No new voices; stance is carried by ink, seal pressure, margin
  crowding, correction marks — the research's own alternative at `:45`. Zero new cast, and
  it is the substrate E2 needs anyway.
- **(c) Hybrid.** Document semantics carry stance; the *existing* four personas get one
  short marginal annotation each, in their established voice, at the moment their standing
  moves — reusing `personaRunLines`' grammar rather than inventing a chorus.
**Recommendation: (c).** It gets the dramaturgy the research is really asking for without a
second cast, it composes with Easy Read (the annotation flattens to a plain descriptor), and
the authored surface it needs already exists.

**Q2 · Does the stance *word* leave the screen, or only stop being the primary carrier?**
E2's headline is "replace stance words." Today the word is the only stance signal, in four
places (`CaseRail.tsx:189`, `:326`, `Debrief.tsx:201`, plus the gated number). The research
also warns, twice, against diegesis so pure it hides the game
(`ui-patterns-deep-research.md:59`, `:61`) and says labels should *confirm* an inference.
**Recommendation: the word stays, demoted.** The atmospheric signal leads; the word becomes
a quiet confirmation in the dossier, and Easy Read promotes it back. Removing it entirely
would make trust legible only by inference, which is the exact "tooltip dependence and label
debt" failure inverted. Confirm you agree before W2-6 is briefed.

**Q3 · Is W1-4's purpose copy yours to write, or may the builder draft it for your
approval?** The four lines the audit sketched (`design-gap-audit-2026-07.md:113`–`116`) are
in-voice drafts, not ratified copy, and §4.3 makes narrative strings sacred.
**Recommendation:** you write (or ratify) the four lines; the builder ships the placement,
triggers and measurements against §3.4's structural criteria. If you would rather the
builder draft them, say so and W1-4 becomes non-blocking — otherwise it ships last in
Wave 1 and everything else proceeds without it.

---

## 7. Reconciliation with `docs/design-gap-audit-2026-07.md`

| audit finding | status there | research enrichment | resolution here |
|---|---|---|---|
| P1-A type hierarchy | DONE at `97c8704` | — | Wave-1 precondition (§3) |
| P1-B console alpha | DONE at `97c8704` | — | precondition |
| P1-C plate caption contrast | DONE at `97c8704` | **E8** | the *same defect one layer up* is W1-1's core: `.scene-beat-line` still relies on a halo and was never probed |
| P1-D inspector collapse | PARTLY / PROPOSED | **E1b** | `[MERGE]` → W2-3 |
| P1-E site name ×3 | PROPOSED | — | W2-7 |
| P2-A label weight | DONE at `97c8704` | E6a | landed; Easy Read extends the same primitive |
| P2-B triple dimming | DONE at `97c8704` | — | precondition |
| P2-C solid slabs | DONE at `97c8704` | E1a | precondition |
| P2-D on-plate label size | DONE at `97c8704` | E8 | precondition |
| P2-E mobile console 82 % | PROPOSED | E1 (mobile record sheet) | `[MERGE]` → W2-4 |
| P2-F purpose vs. state | PROPOSED | **E2 / research `:61`** | `[MERGE]` → **pulled forward to W1-4** |
| P3-A display band | PROPOSED | E1a | folded into W1-2 criterion 4 as a guardrail (no new size literals) |
| P3-B chrome copy length | NOT DONE, deliberate | — | `[MERGE]` → W1-4, writer-gated |
| P3-C `1 ADMITTED SIGNALS` | PROPOSED | — | `[MERGE]` → W1-4 criterion 7 |

**Unreconciled, and worth stating:** the audit measured Case 77 only
(`design-gap-audit-2026-07.md:270`). Every Wave-1 acceptance criterion above should be
re-measured on Case 81, whose art and copy lengths differ, before any item is called done.
