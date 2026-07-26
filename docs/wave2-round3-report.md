# Wave 2 · Round 3 — E1b, the inspector collapse (audit P1-D)

Status: implemented. Every claim below is labelled **EXECUTED** (a command was
run and its output observed) or **INFERRED** (read, not run). Feel is the user's.

Scope: `docs/enrichment-roadmap.md` **E1b / W2-3** `[MERGE: audit P1-D]` — "when a
room console is docked, the inspector has no job left; collapse it to a narrow
spine and let the plate take the full width… the single largest remaining
ambience win at 1280, and a layout decision, not a style one"
(`design-gap-audit-2026-07.md:86`–`89`).

Nothing was committed. Git is the reviewer's.

---

## 1 · What shipped, by sub-step

| # | file | change |
|---|---|---|
| 1 | `src/game/ledger.ts` | **`momentForSite(state, siteId, ledger?)`** — the site→moment join round 2 left owed (§8.3). Resolves through the precedent seam; `undefined` for an unfiled location |
| 1 | `src/game/siteRecordText.ts` | **new, pure** — `spineKeeps` / `inspectorProse` / `detailDrawerProse` / `collapseRetires` / `equivalenceGaps` / `ledgerGapsForFiledSite`. The equivalence proof the always-mounted scar demands, as a function rather than a DOM diff |
| 1 | `src/game/siteRecordText.test.ts` | **new** — 8 tests, including the non-vacuity guard and the Case 81 precedent-override join |
| 2 | `src/components/Investigation.tsx` | `SIDE_BY_SIDE_WORKSPACE_QUERY` + live listener; the `inspectorSpine` phase gate; the spine branch; the two prompt strings extracted to constants; `standingNote` wired to the drawer |
| 2 | `src/components/SceneDetailDrawer.tsx` | optional `standingNote` prop, rendered above the methods |
| 3 | `src/styles.css` | `.field-workspace--spine` (inside `@media (min-width: 841px)`), `.site-inspector--spine`, `.site-header--spine`, `.site-spine-summon`, `.scene-detail-standing-note`; **two measured fixes**: the docked console's lead lines `--fog-dim` → `--fog` (§6), `.scene-detail-summon` `min-height` 40 → 44px (§7) |
| 4 | `scripts/evidence-inspector-collapse.mjs` | **new** — 71 checks, 25 screenshots, both viewports |
| 5 | `scripts/audit-contrast-probe.mjs` | 3 targets and 1 surface **added**; nothing removed, no floor lowered |
| 5 | `scripts/evidence-pilot-care-ward.mjs` | one clause re-baselined, disclosed in full at §8 |

**No reducer change, no persistence change, no new persisted field, no schema
bump, no new runtime dependency, no content-file edit, no narrative string
re-worded, no `--type-*` or `--label-*` token retuned.** `vite.config.ts` and
`.claude/launch.json` untouched.

---

## 2 · The phase gate — what collapses, and the three states that deliberately do not

```ts
const inspectorSpine =
  sideBySide &&                                   // ≥ 841px: the workspace is two columns
  !selectedCompletedAction &&                     // not a filed location
  (roomConsoleDocked || (sceneFirstPlate && !roomSite))
```

Round 2 §8.2 is the reason this is a *gate* and not a global rule: the ledger can
never carry pre-commit method prose, so the inspector's job "genuinely ends only
once the site is filed." That turned out to be the right instinct with the wrong
surface — the **drawer** does carry the pre-commit method prose (it always has:
`SceneDetailDrawer.tsx:156`–`170` renders every authored method in full, filed or
not), so the collapse can happen *before* filing. What it cannot do is happen in
the three states below, and each exclusion is a measurement, not a preference:

1. **A filed location.** The column holds the resolved card, the record-delta grid
   and the reaction quotes — 337 characters of real content (EXECUTED).
2. **A room at its TERMINAL phase.** The console has come back out of the dock
   into `.room-console-slot` and is printing the room's own authored unlock line
   (EXECUTED: `"One reading can be authenticated for provena…"`). Collapsing there
   would hide authored prose that **no** other surface carries.
3. **Every stacked width.** Below 841px `.field-workspace` is a flex column
   (`styles.css` `@media (max-width: 840px)`); a 72px rail there would retire
   prose and reclaim nothing.

The gate is width-aware in **React**, not only in CSS. That is a deliberate
choice with a cost: `SIDE_BY_SIDE_WORKSPACE_QUERY` duplicates the stylesheet's
841px, because a media query is not readable from script. The payoff is that at
375 the DOM is *byte-identical to before* — which is what makes "no narrow-layout
regression" provable rather than argued (§5). The harness asserts both sides.

---

## 3 · The equivalence proof — both halves

### The pure half — `src/game/siteRecordText.ts`

`equivalenceGaps(state, siteId)` returns the strings the collapse retires that the
Location detail drawer does **not** carry. **It must be empty.** EXECUTED, over
every Case 77 location × four run states (fresh, second approach, mid-run with two
filings and a model, the alarmed/override route), and over every Case 81 location:
**zero gaps, everywhere.**

The suite also guards against the proof passing *because nothing is retired*:
`collapseRetires` is asserted to hold **≥ 9 strings per location** and to contain,
by identity, the site's `description` and both methods' `description` and
`consequence` (EXECUTED).

What is proved to move, string-for-string:

| retired from the inspector | carried by |
|---|---|
| `site.description` | `.scene-detail-description` |
| every method's `methodLabel` / `title` / `description` / `consequence` | `.scene-detail-method` × 2 |
| the filed card — event title, `eventDetail`, exhibit title, civic trace, standing, `Override acquired` | `.scene-detail-filed` |
| every persona reaction, name and line | `ReactionQuotes` (the same component) |

### The second, independent half — the ledger

`ledgerGapsForFiledSite` uses the new `momentForSite` join to ask the same
question of the **record** for a closed location. EXECUTED: the narrative half
(event title, detail, exhibit, voices) is on the ledger moment for every closed
location of a real run.

**A finding, recorded because it changed the test:** the first draft compared for
*equality* and failed on `eventDetail`. The reducer appends
`describeTrustDeltas(...)` to a commit event's detail, so the ledger prints the
authored string **with the run's trust arithmetic after it**. The authored string
is on the record; it is not the whole of the logged line. The check is now
containment, and the comment in the module says why.

### The live half — `scripts/evidence-inspector-collapse.mjs`

The pure module could be a self-consistent lie about the shipped DOM, so the
harness re-derives the same claim from the browser. For each location it:

1. enters the close read, then **returns to the concourse** — same location, same
   selection, column at full width — and reads the **expanded** inspector's prose
   out of named nodes (`.site-description`, `.site-cost-note`, each
   `.choice-body strong/span/small`), never `innerText`;
2. re-enters, asserts the spine, opens the drawer from whichever summon exists,
   and asserts every captured string is present, character for character.

EXECUTED, 1280×800: **zero missing** on all four locations; Care ward compares
**2 full methods** (8 fields) as well as the description, so that row is not
vacuous. `aria-modal` count is 1 throughout.

---

## 4 · The measurements

### Plate and column, 1280×800

Before = the same probe against **HEAD's code**, run before any of this round's
edits existed (EXECUTED; reproducible with `git stash` + the same script).

| location | inspector w | plate w | plate area | scene above console (h) | scene above console (area) |
|---|---|---|---|---|---|
| Registry intake | 342.8 → **72** | 889.3 → **1160** | 423 307 → **552 160** (+30.4%) | 285.8 → 285.8 (+0) | 254 162 → **331 528** (+30.4%) |
| Care ward 12 | 342.8 → **72** | 889.3 → **1160** | 423 307 → **552 160** (+30.4%) | — (no console) | — |
| Maintenance spine | 342.8 → **72** | 889.3 → **1160** | 423 307 → **552 160** (+30.4%) | 226.6 → **241.8** (+6.7%) | 201 515 → **280 488** (+39.2%) |
| The Small Archive | 342.8 → **72** | 889.3 → **1160** | 423 307 → **552 160** (+30.4%) | 255.7 → 255.7 (+0) | 227 394 → **296 612** (+30.4%) |

**Read the height column honestly.** The rooms round's number (acoustic 97 → 214px)
was a *height*, and this round's gain is *horizontal*: the plate is 476px tall in
both worlds because the workspace height is fixed, so the console can only rise if
its tableau reflows into the extra width. **Only the acoustic tableau does**
(249.4 → 234.2px tall, so the photograph above it grows 15.2px). Registry's and the
Archive's tableaux are authored grids that do not consume extra width, and their
console heights are unchanged to the pixel.

So a height-only report would say "two of three rooms unchanged" about a change
that put **30–39% more photograph on screen** in every one of them. Both columns
are printed above; the area column is the one that answers "how much of the room
can the player see."

Inspector text length in the collapsed phases fell from 263–303 characters in a
342.8 × 476 column to the spine's identity line — the ~85% emptiness the audit
measured is gone rather than re-spaced.

### 375×812

**Nothing changed.** EXECUTED, per location: `spinePresent === false`,
`workspaceSpineClass === false`, inspector 347px, plate 375px, and the collapsed
state's `.site-description` **string-compared equal** to the expanded one. Page
scroll heights are identical to the pre-change run (1105 / 1090 / 1277). The
audit's mobile items (P2-E console peek, P1-E switcher height) are **not in scope
and were not attempted**, as instructed.

---

## 5 · The always-mounted rule, asserted live

The recorded scar (`annex-investigation-inspector-always-mounted`; pilot report
Deviation 5) is that canonical controls must render *somewhere* at all times.

- **Sampled through a whole entry**, not just at rest: the transition state and
  the spine are read together every ~70ms across `travel → arriving → closeup`.
  EXECUTED, both viewports: **no sample shows a spine outside a settled close
  read**, the description is on screen at every non-closeup sample, and there is
  **exactly one room-console instance at every sample**.
- **One summon to the full text, in exactly one place.** The spine's button is the
  *same control and the same class* (`.scene-detail-summon` + a placement
  modifier) as the plate's, so every existing selector, style and assertion still
  finds exactly one. EXECUTED: `detailSummons === 1` in every collapsed state —
  in the spine for the three console rooms (the plate has no summon-rail entry
  during a ritual), on the plate for Care ward.
- **The slot survives the collapse.** `.room-console-slot` is still rendered
  (empty) inside the spine, so the host's return trip has a target in the same
  commit that un-collapses the column. EXECUTED: `consoleSlots === 1`,
  `slotChildren === 0` while docked; `slotChildren === 1` at terminal phase.
- **The section's own identity is untouched.** The header is the same element,
  restyled — so the `h2`, its place in the heading order, and the
  `aria-labelledby` target all survive. EXECUTED: `headingIdResolves === true` in
  every state.

**AT — keyboard-only, a whole location, in the collapsed state.** EXECUTED at
1280×800: Tab alone reaches the spine's summon (first Tab), Enter opens the
drawer, Escape returns focus to the summon; Tab alone then reaches the docked
console; the custody ritual completes on Enter presses and hands the route to a
plate zone; Enter arms, Enter files; the beat and the result strip are reached and
dismissed by key; the filed location's drawer is then reached by Tab and carries
both method articles. 39 focus samples.

**On "focus never falls to `<body>`" — the instrument was wrong first, and the fix
is recorded.** The first run reported 2 drops. Both were the *browser's* tab
cycle: past the last focusable, focus passes through the document root before
wrapping to the skip link (in headless there is no browser chrome to hold it).
That is the platform, not the recorded pilot scar, which is focus falling to
`<body>` because the control holding it **unmounted**. The check now labels every
sample by cause and asserts two things instead of one: **zero `<body>` samples
after an activation**, and **every `<body>` sample proved to be a wrap** by the
skip link following it. EXECUTED: `afterActivation: 0`, `unexplained: 0`,
`wraps: 2`.
→ **detection rule:** a focus-loss assertion must distinguish an unmount from a
document tab-cycle wrap, and must *prove* the wrap rather than exclude it.

---

## 6 · A real contrast regression, found and fixed — with the number that matters

Widening the plate moves the photograph under the docked console, and the probe
caught it: **`docked console · prompt` fell to 4.33 : 1** at `console-custody@1280`
against a 4.5 floor.

The committed baseline (`git show HEAD:evidence/design-gap-fix/contrast-probe.json`)
says the row was already at **4.51** (custody) and **4.50** (acoustic) — a pass by
0.01, which is *inside this instrument's own jitter*, because the sampled value is
the brightest pixel behind a glyph and it moves with the crop. The three rooms'
lead lines render at `--fog-dim` — the palette's dimmest body register — at 11.2px
over a console whose top edge is only 0.6 alpha.

A nudge would have bought another coin toss. Computed from the sampled pixels:
**even a fully opaque console caps this row at ~4.88 : 1**, so the alpha is not the
lever; the register is. `--fog-dim` (oklch L 0.59) → `--fog` (L 0.72) on the
**docked** console only. EXECUTED after: **7.18 / 7.60 / 7.73 / 7.83** across the
four surfaces. The slotted console keeps `--fog-dim` (a flat panel is not a
photograph), the titles above these lines are `--record` so the hierarchy is
unchanged, and this is the same argument the sheet already makes for
`.high-contrast .room-console` and for the Easy Read rule that promotes these exact
three selectors.

**Probe additions, all additive.** Three targets — `spine · status stamp` (a
register that had **no** target at all before this round, collapsed or not),
`spine · summon to the full text`, `record mode · relocated standing line` — and
one surface, `record-detail-ritual` (the drawer opened from the spine mid-ritual),
which is the only state that renders the relocated line. EXECUTED: 4.83 / 8.37 /
8.24, all pass; **ALL PASS** overall.

The spine's heading needed no new target: it is the same `.site-header h2`
element, and it is still measured on the collapsed surfaces (19.26 : 1). No
register lost its only measurement — `.site-cost-note` keeps `concourse@1280` and
`@375`; `.site-description` keeps `beat-*@1280` and the four 375 surfaces
(EXECUTED, compared row-by-row against the HEAD artifact).

---

## 7 · Deviations, each with its reason

**D1 · The two standing chrome lines are RELOCATED to the drawer, not retired.**
The collapse stops the inspector printing `.site-cost-note` (the W1-4 / P2-F
irreversibility line on a bounded-room location) and `.site-action-prompt`. Both
are UI chrome rather than case content, so `equivalenceGaps` does not cover them —
which is exactly why dropping them would have been the easy, invisible loss. The
drawer takes whichever one applies, through a `standingNote` prop, from the *same
constant both surfaces read*, so the two homes cannot drift. Exactly one instance
exists at any moment: the inspector when expanded, the drawer when the spine is
up. Asserted live (`drawer.standingNote === expanded.costNote`) and measured by
the probe.

**D2 · `.scene-first-note` is retired outright, and that is the point.** "The
station stands in the room above. Work it there; this record keeps the location's
text." is a sentence whose only job was to explain why the column looked empty.
The spine says it structurally. Same for the plain site's "The two methods stand
in the room above."

**D3 · A room at its terminal phase does not collapse.** Argued at §2.2 — the
console is back in the slot printing `room.unlockLine`, which is authored content
with no second home. Collapsing there is a *later* decision that needs the unlock
line to get one first, and it is listed in §10 for the next round.

**D4 · The gate is width-aware in React, duplicating the CSS breakpoint.** §2. The
alternative — a CSS-only `display: none` — keeps the prose in the DOM at every
width, but then the relocation in D1 becomes impossible to keep to one instance
(the drawer cannot know whether a media query hid the inspector's copy). The
duplicated 841 is disclosed, commented on both sides, and asserted at both
viewports.

**D5 · Two shipped-surface fixes rode along, both because this round's own
instruments caught them.** The console prompt's contrast (§6) and
`.scene-detail-summon`'s `min-height` 40 → 44px — the latter is the *plate's*
existing summon, not the new one, and it was the only positioned control on the
plate under the repo's own 44px rule (134.8 × **40** at 1280, 123.5 × **40** at
375). The summon rail is `align-items: flex-start` beside an 89.4px-tall case-file
summon, so the row height is unchanged; all six suites re-run green after it.

**D6 · No transition is authored on the collapse.** The width change coincides
with the plate's own arrival/dock animation; a second competing tween is the
opacity-strand scar in a new costume. Reduced motion therefore needs nothing from
this round, which is asserted rather than assumed (§8).

**D7 · The spine's name and status are set in `writing-mode: vertical-rl`,** with
no rotation transform. A rail is the one place a horizontal line cannot go, and a
plain vertical writing mode keeps the text selectable, hit-testable and sampleable
by the contrast probe (verified: 4.83 : 1 on the status stamp, measured from real
glyph rects).

---

## 8 · Harness edits, disclosed

**`scripts/evidence-pilot-care-ward.mjs` — one clause re-baselined, nothing
relaxed.** `[…] Registry intake is untouched by the pilot` asserted
`detailSummon === false`. The world changed: the collapsed inspector now carries
exactly one summon of its own. The original intent — *this location's plate
carries no summon-rail entry while its ritual runs* — is kept **verbatim in
meaning** as `summonsOnPlate === 0`, and two clauses are **added** that pin the
total to a named place rather than to a smaller number:

```js
registry.summonsOnPlate === 0 &&
registry.summonsTotal === (registry.spinePresent ? 1 : 0) &&
registry.summonInSpine === registry.spinePresent
```

The `spinePresent ? 1 : 0` form is what makes the same clause correct at 375
(no spine, no summon) and at 1280 (spine, one summon) without an "at least".
No assertion was deleted or weakened. Result: 52 passed / 1 failed, the
**unchanged** documented Case 81 seed-save skip.

**`scripts/audit-contrast-probe.mjs`** — 3 targets and 1 surface added. Additive
only; no target removed, no floor lowered.

**Two instrument errors in my own new harness, fixed before they could be reported
as product defects** — both the recurring class, both recorded:

1. **A zone is its RING, not its caption box.** The first sweep failed at 375 with
   a 258 × 102px "overlap" between the two plate zones. The caption is
   `pointer-events: none`; the live region is a 62px (44px narrow) `::before` disc
   on the ring, and below 700px the captions are deliberately 300px wide *because
   only one is ever revealed at a time* (`styles.css`, the comment is explicit).
   The sweep measured the wrong box in both directions — under-reporting the tap
   target *and* manufacturing the overlap.
   → **detection rule:** a hit-test or overlap sweep must measure the element's
   *interactive region*, which is not always its border box.
2. **The focus instrument conflated an unmount with a tab wrap.** §5.

---

## 9 · Verification

All gates run under Node 24 against the already-running dev server on :3000.

| gate | result | register |
|---|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | clean | **EXECUTED** |
| `npx eslint .` | clean | **EXECUTED** |
| `npx vitest run` | **348 passed / 20 files** (was 340 / 19) | **EXECUTED** |
| `npx vite build` | built, no PostCSS error | **EXECUTED** — the mandatory post-`styles.css` gate |
| `scripts/evidence-inspector-collapse.mjs` | **71 / 71**, 25 screenshots | **EXECUTED** |
| `scripts/audit-contrast-probe.mjs` | **ALL PASS** (with 3 added targets, 1 added surface) | **EXECUTED** |
| `scripts/evidence-pilot-care-ward.mjs` | **52 passed / 1 failed** — the documented Case 81 seed-save skip, unchanged | **EXECUTED** |
| `scripts/evidence-rooms-scene-first.mjs` | **110 / 0** | **EXECUTED** |
| `scripts/evidence-persona-portraits.mjs` | **37 / 0** | **EXECUTED** |
| `scripts/evidence-hud-collapse.mjs` | **131 / 131** | **EXECUTED** |
| `scripts/evidence-record-search.mjs` | **97 / 97** | **EXECUTED** |

The zero-failure state is not regressed: every suite was re-run **after** the last
edit (the 44px summon), not before it.

Screenshots: `evidence/inspector-collapse/`, 25 files at 1280×800 and 375×812 —
the close read per location, the drawer over the spine, the terminal phase and the
filed location proving they do **not** collapse, the two sweeps, the split-focus
frame, the keyboard drawer and filed states, and the reduced-motion spine.

---

## 10 · UNVERIFIED / open, and what the next round needs from this state

- **Feel is unverified, by definition.** The frames to look at are
  `evidence/inspector-collapse/01-care-ward-close-read-1280x800.png` (the biggest
  single change in the game's composition) and
  `01-registry-intake-close-read-1280x800.png`. The spine's vertical name-and-status
  rail is a taste call; so is whether a 1160px plate reads as *the room* or as a
  banner.
- **The focus ring around the spine.** `revealSiteWorkspace` hands focus to the
  section on entry, and `.site-inspector:focus-visible` draws a 2px ring — which
  now outlines a 72px rail instead of a 343px column and reads loudly on the
  captures. It is the *pre-existing* behaviour and it is correct for a keyboard
  player; changing where entry focus lands is a separate decision that touches the
  rooms' and pilot's focus assertions. **Flagged, not changed.**
- **The scene-above-console HEIGHT did not move for two of three rooms.** §4 says
  why and reports the area instead. Making the console genuinely shorter needs the
  three tableaux to reflow into a 1160px plate — that is a per-room layout job,
  not a column one, and it was not attempted.
- **Real devices and real assistive tech. UNVERIFIED.** Everything was captured in
  headless Chrome. The AT claims are structural (one control per surface in the
  tree, `aria-labelledby` resolving, focus never lost to an unmount), not a
  screen-reader run. `writing-mode: vertical-rl` in particular has never been
  heard, only measured.
- **Non-Chromium browsers. UNVERIFIED.** Unchanged from previous rounds.
- **Case 81 never collapses** (it authors no `closeup.sceneFirst`), so the spine is
  proved only by the pure suite there, never rendered.
- **High contrast and forced colours for the spine. UNVERIFIED.** The spine
  inherits `.site-inspector`'s existing overrides rather than adding its own, so
  nothing new is *expected*, but no capture exercises it — the same gap the rooms
  report recorded for the docked console.
- **No memory entry was written.** The two instrument scars in §8 and the focus-
  instrument rule in §5 are stated here; the memory file is the reviewer's to keep.

### What E6b (document semantics) and then E2 (legal weather) need from this state

1. **The spine is now the only thing between the plate and the page edge at
   1280.** E2's ambient "legal weather" is a *plate* treatment
   (`previewTreatment` → `data-preview-treatment`), and the plate is 30% larger in
   area than the treatments were authored against. Any alpha or vignette value E2
   tunes should be tuned on the **1160px** plate, not re-derived from the audit's
   889px measurements.
2. **`.room-console`'s lead register moved** (§6). E6b will want ink/hand states on
   console text; the docked console's prompt is now `--fog`, and the *slotted*
   console's is still `--fog-dim`. Either E6b treats "docked" as a first-class
   context or it unifies them — but it should not discover the split by accident.
3. **`momentForSite` exists now, and has one consumer.** E6b's correction marks and
   seal states are per-filing; the join from a location to its moment is the hook
   they need, and it is pure and tested.
4. **The seventh-tab constraint from round 2 still holds** — six cells, two rows
   below 700px. Nothing this round changed that.
5. **The collapse has a fourth candidate state it deliberately did not take**: a
   room at its terminal phase (§7 D3). It cannot collapse until `room.unlockLine`
   has a second home. The cheapest one is the Location detail drawer, beside the
   standing note that already landed there this round — a genuinely small addition
   whenever someone wants the last 15% of the emptiness back.
