# Wave 2 · Round 2 — the ledger (E3) + the owed record harness

Status: implemented. Every claim below is labelled **EXECUTED** (a command was run
and its output observed) or **INFERRED** (read, not run). Feel is the user's.

Scope: `docs/enrichment-roadmap.md` **E3 / W2-2** (the Obra Dinn ledger with the
Golden Idol structured filing), plus the debt `docs/wave2-round1-report.md` left
open — a re-runnable harness for the searchable record.

---

## 1 · What shipped

| file | change |
|---|---|
| `src/game/ledger.ts` | **new** — pure derivation: findings, chronology, contradiction pairs, replayed civic-alarm cost |
| `src/game/ledger.test.ts` | **new** — 23 tests, including the reducer-reconciliation guard and the cross-case leak guard |
| `src/components/CaseRail.tsx` | Ledger as a **sixth tab**, sitting **second**; `costLine()` helper |
| `src/styles.css` | `.ledger-*` family; `.rail-tabs` 5 → 6 columns; two-row wrap below 700px |
| `scripts/evidence-record-search.mjs` | **new** — the owed harness, 97 checks, 23 screenshots |
| `scripts/evidence-hud-collapse.mjs` | tab assertions re-baselined 5 → 6 (§5) |
| `scripts/audit-contrast-probe.mjs` | 8 added targets, 3 added surfaces (additive only) |

No reducer change, no persistence change, no new persisted field, no schema bump,
no new runtime dependency, no content-file edit, no narrative string re-worded.

---

## 2 · E3 — the ledger

### The tab, and why it is named "Ledger" and sits second

`case · **ledger** · evidence · log · people · search`.

The register argument: the panel is a *ledger* and the existing panel is a *log*,
and that is the real bookkeeping distinction — the log is the append-only
day-book of moments, the ledger is the bound reading of the same record with the
clerk's summary at the front. It sits second because a summary filed behind the
search box is a report nobody reaches; the folio reads assignment → running
account → the papers the account is drawn from → the tool for interrogating them.

### What each moment shows

Forwards, one moment per logged event, on a gutter rule with a per-moment dot:

- the log's own two-digit citation (`Entry 02`), quoted not re-invented;
- the event's authored title and detail, **verbatim**;
- **what it cost** — `CIVIC TRACE · NONE` / `· 0 → 1` / `· ABSORBED AT 3`;
- **what it filed** — the admitted exhibit and the closed location, each with the
  citation its own panel already prints (`77-A testimony`, `Location B · closed`);
- **the contradiction, as a pair** — `THE CLAIM` / `AGAINST IT`, both halves the
  authored strings, shown at the moment of admission;
- what the presences said, grouped one heading per voice.

### The Golden-Idol half — "Findings so far"

Assembled sentences over derived facts, one per fact, never speculative. After one
Care ward filing the panel reads (EXECUTED, asserted string-for-string by both the
unit suite and the harness):

1. `Care ward 12 is closed, and it put “The rain in room twelve” on the record.`
2. `1 admitted exhibit carries a contradiction against it.`
3. `No memory model is on file.`
4. `The tribunal will not hear this record yet: one more location must be closed and a memory model must be filed.`

A carried precedent adds a fifth, first: `A prior ruling is carried in from an
earlier case and cited on this record.`

The threshold sentence is read from **`canEnterTribunal`** itself, so it cannot
disagree with the gate; `ledger.test.ts` walks a run across the gate and asserts
the agreement at every step (and asserts the walk actually crosses it, so the test
cannot pass vacuously).

### The one derived number, and how it is reconciled

Per-moment civic alarm exists nowhere in `GameState` — only the current total. It
is recovered by mirroring the reducer's arithmetic (`clamp(alarm + resolved
alarmDelta, 0, 3)`, resolving through `resolveFieldAction` so a precedent-overridden
alarm is honoured). **The replay's final value is asserted equal to `state.alarm`
on every run the suite builds** — if the reducer grows a third alarm source, the
test fails rather than the ledger silently lying about a cost. The Case 81
`forge-certification-seal` override (base +1, +2 under a Case 77 forgery verdict)
is exercised explicitly, both branches, each reconciled against `state.alarm`.

---

## 3 · Deviations, each with its reason

**D1 · The name-count rule is enforced PER MOMENT on the ledger, not per surface.**
A chronology of a run necessarily revisits the same four presences; the log panel
does too, and no harness holds that surface to exactly-once (`nameCounts` is
applied only to `#rail-panel-people` and the persona surfaces). The ledger authors
**one** persona heading — the per-moment voice bucket, deduped by `groupByVoice` —
and both numbers are measured. EXECUTED, after one filing: per-moment counts are
`[[], ["The Shepherd"]]`; the per-surface count for The Shepherd is **2**, and
both occurrences are authored text — the voice heading, and the authored
contradiction string *"The Shepherd remembers Mara using the same image as a
calming metaphor."* Suppressing the second would mean editing a sacred string.
The per-moment clause is a gate; the per-surface number is recorded, not gated.

**D2 · Trust deltas are QUOTED, not re-derived; only alarm is derived.**
The reducer already appends `describeTrustDeltas(...)` to every commit event's
detail, and the ledger prints that detail verbatim. Re-deriving trust from
`FieldActionDefinition.trust` would be *wrong* on the deposition path, where the
committed deltas are the base action's merged with per-beat choices and the
consent ask — and the chosen beats are not recoverable from persisted state. A
ledger that printed a cost the run did not pay, on the one surface whose whole job
is to be trustworthy, is a worse outcome than one fewer derived column.

**D3 · "Findings so far" carries five sentence kinds, not the brief's four.**
The added one is the contradiction count. It is derived, plural-safe (the P3-C
scar: `1 admitted exhibit carries…` vs `3 admitted exhibits carry…`, both
asserted), absent entirely when nothing is admitted, and it is the sentence that
makes the game's central fiction legible before the reading starts.

**D4 · Contradiction pairs are shown IN PLACE, not as a separate block.**
The brief required the pair; it did not fix the location. A filing carries its own
contradiction, so the pair sits under the moment that admitted the exhibit. A
second top-level block would have re-printed the same authored strings twice on
one panel — the codex-dump failure mode in miniature.

**D5 · Below 700px the six-cell tab bar wraps to two rows of three.**
Six cells across a 375-wide sheet leave ~46px of content box, which cannot hold
"Evidence 1". The alternatives were shrinking a label below legibility or
scrolling a tab out of reach; both are worse than a second row of the *same*
sticky bar (no third chrome row is added above the fold, and every cell keeps its
48px height). EXECUTED at 375: two rows, `125px 125px 125px`, all six cells ≥44px,
no label spills its cell, no overlap, each centre activates its own cell.

**D6 · The owed harness and the ledger harness are one file.**
Argued in the script's own header: E5 and E3 are two panels of one drawer reached
by one boot, one site entry and one filing. A sibling would duplicate ~250 lines
of CDP scaffolding *and* re-run the same expensive real filing to look at a second
tab of the same open dialog — and the fresh-run emptiness proof is literally the
same proof for both surfaces.

---

## 4 · Verification

All gates run under Node 24 against the already-running dev server on :3000.

| gate | result | register |
|---|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | clean | **EXECUTED** |
| `npx eslint .` | clean | **EXECUTED** |
| `npx vitest run` | **340 passed / 19 files** (was 317 / 18) | **EXECUTED** |
| `npx vite build` | built, no PostCSS error | **EXECUTED** — the mandatory post-`styles.css` gate |
| `scripts/audit-contrast-probe.mjs` | **ALL PASS** | **EXECUTED** |
| `scripts/evidence-record-search.mjs` | **97 / 97** | **EXECUTED** |
| `scripts/evidence-hud-collapse.mjs` | **131 / 131** | **EXECUTED** |
| `scripts/evidence-rooms-scene-first.mjs` | **110 / 0** | **EXECUTED** |
| `scripts/evidence-persona-portraits.mjs` | **37 / 0** | **EXECUTED** |
| `scripts/evidence-pilot-care-ward.mjs` | **52 passed / 1 failed** — the documented case-81 seed-save skip, unchanged | **EXECUTED** |

### Contrast — measured, not assumed

Eight ledger selectors were **added** to the probe (none removed), and three
surfaces added: `record-ledger`, plus two that scroll the contradiction pair and
the voice heading into the scroll port. That second part is load-bearing: `PREPARE`
only samples glyph boxes `elementFromPoint` actually hits, so a target below the
fold reports as *absent* rather than as measured — the first run reported the
ledger clean while two of its registers had never been sampled at all.

EXECUTED, worst ratio per row, both viewports, floor 4.5:

| row | 1280 | 375 |
|---|---|---|
| findings sentence | 17.13 | 17.13 |
| moment title | 17.13 | 17.13 |
| moment citation | 4.97 | 4.97 |
| cost column | 8.24 | 8.24 |
| filing title | 16.36 | 16.36 |
| filing citation | **4.74** | **4.74** |
| contradiction pair | 17.13 | 17.13 |
| voice heading | 17.13 | 17.13 |

`filing citation` at 4.74 : 1 is the tightest row on the surface. It passes AA, and
it is the shipped `--fog-dim` mono citation register that `.persona-dossier-cite`
and `.record-search-cite` already use — so tightening it is a global decision, not
a ledger one. Recorded, not changed.

### The new harness — what it actually proves

`scripts/evidence-record-search.mjs`, 97 checks, 23 screenshots into
`evidence/record-search/`, at 1280×800 and 375×812. Every scenario the round-1
report listed as owed is now scripted:

- **fresh-run emptiness** — `room twelve` answers *"No entry answers to “room
  twelve”."*; `custody` answers with exactly one group, `On the log`, one entry:
  the approach the run took and nothing else. The fresh **ledger** is asserted the
  same way — three findings sentences, one moment, no filing, no cost, nothing
  carried in;
- **a term hitting evidence** — `rain` → `Admitted evidence` group carrying
  *The rain in room twelve* cited to *77-A testimony*, plus the log entry that
  admitted it; the count line agrees with what is on screen;
- **a term hitting a persona reaction** — `person in that room` → `Said on the
  record`, one voice heading (*The Shepherd*), the authored line verbatim; the
  panel names each presence at most once;
- **a no-hit term** — `zeppelin` → status line and empty state both say so, zero
  groups;
- **the query trail accumulating** — three questions, newest first, all three real
  ≥44px controls, exactly one marked as the question being answered; clicking a
  past question re-asks it **without lengthening the trail**;
- **keyboard only** — Tab reaches the Search tab, Enter opens it, Tab reaches the
  field, `Input.insertText` + Enter submits, results answer, Tab through the
  results never leaves the dialog and reaches the trail control; the Ledger tab is
  reached and opened the same way; Escape returns focus to the summon. Full
  transcript in `measurements.json`;
- **Easy Read** — the class reaches the portal boundary (1 at rest, 2 with the
  drawer open), the submit button's tracked capitals flatten, no element on either
  panel is uppercase **and** tracked past 0.06em **and** longer than four words,
  and — the real test — the accessible text of each panel is **byte-identical** to
  the plain run's (search 829 = 829 chars, ledger 1310 = 1310). Styling flattened,
  content untouched;
- **reduced motion** — nothing on either panel animates or transitions past 1ms;
- **375-wide capture** — of the search panel, the ledger, and the wrapped bar.

Anti-codex datum, **recorded not gated**: after one filing the ledger panel holds
1284 characters against the log panel's 522. The ledger is denser because it adds
the findings block, the filings, the pair and the cost — whether that is a *wall*
is a judgement, not a threshold, and it is the user's call (§7).

---

## 5 · Harness edits, disclosed

**`scripts/evidence-hud-collapse.mjs` — the tab count, 5 → 6.** The world changed;
nothing was relaxed. Every earlier clause is kept verbatim and the new tab adds its
**own** clause, so the count stays pinned to a named set:

```js
geometry.tabs.length === 6 &&
  geometry.tabs.every((t) => t.controls && t.id && t.pressed !== null) &&
  geometry.tabs.some((t) => /people/i.test(t.text)) &&
  geometry.tabs.some((t) => /search/i.test(t.text)) &&
  geometry.tabs.some((t) => /ledger/i.test(t.text))
```

The cross-zone sweep's count moved 5 → 6 with its clause (`every centre hits its
own cell`) untouched, and `'ledger'` was added to the two per-tab loops. **No
assertion was deleted or weakened.**

**A finding while re-baselining, worth stating.** The committed
`evidence/hud-collapse/measurements.json` at HEAD reports **123 checks and "four
tabs, aria-wired"** — i.e. it predates round 1's fifth tab, even though the round-1
harness *code* at HEAD already asserted five. So the "123" figure quoted in this
round's brief is a stale artifact, not a pre-round-2 run. The honest baseline for
HEAD's code is **127**; this round takes it to **131**, all passing. Diffed
check-name-by-check-name (EXECUTED): 10 added, 2 removed, and the 2 removed are the
two `four tabs, aria-wired` rows replaced by their `six tabs` successors.

**`scripts/audit-contrast-probe.mjs`** — 8 targets and 3 surfaces added. Additive
only; no target removed, no floor lowered.

---

## 6 · Two instrument scars found and fixed in the new harness

Both were false failures in **my own** first draft, caught before they could be
reported as product defects. Recording them because both are the recurring class:

1. **`transitionDuration !== '0s'` is the wrong test for reduced motion.** The
   app's contract is `transition-duration: 0.01ms !important`
   (`styles.css:8657`–`8664`) — the standard technique, because a zero duration
   still fires `transitionend` while `none` would strand animation-driven layout.
   The first draft failed a *correctly reduced* panel on `1e-05s`. The check now
   uses a 1ms floor, two orders of magnitude above the app's value and far below
   anything visible.
   → **detection rule:** a motion assertion must compare a duration against a
   perceptibility floor, never against zero.
2. **Rounding each edge to an integer manufactures overlaps on a tiled grid.** Six
   cells in a 520px drawer are 86.5px wide; `Math.round` on `left` and `width`
   produced two phantom 1px overlaps between neighbours in a perfectly tiled CSS
   grid. The sweep now intersects raw floats with a 0.5px epsilon.
   → **detection rule:** never report an intersection (or a shortfall) smaller
   than the instrument's own resolution. This is the recorded threshold-vs-jitter
   scar, in a new costume.

---

## 7 · UNVERIFIED / open

- **Feel is unverified, by definition.** The ledger reads as intended to me on the
  captures, but "does this read as a book or as homework" is the user's eyeball,
  not a number. The frames to look at are
  `evidence/record-search/07-ledger-after-filing-1280x800.png`,
  `08-ledger-contradiction-pair-1280x800.png` and
  `14-tab-bar-ledger-375x812.png`.
- **The two-row tab bar at 375 is a taste call as much as a layout one.** It is
  measured (two rows, 125px cells, ≥44px, no spill, no overlap, correct hit-tests)
  but a reader may still find a wrapped bar busier than a scrolling one.
- **Case 81's ledger is unit-tested, never eyeballed.** `ledger.test.ts` builds a
  real Case 81 run (including the precedent-overridden alarm) and asserts the
  leak-guard and the reconciliation, but no harness screenshots Case 81's ledger.
  The roadmap's own unreconciled note applies: Case 81's copy lengths differ.
- **A ledger with three or four moments has never been rendered.** Every capture
  is a run with one filing. Nothing suggests a problem — the chronology is a flat
  list — but the *density* question above only gets sharper with more moments.
- **`Civic trace · absorbed at 3` has been unit-tested, never rendered.** No
  authored Case 77 route reaches the alarm ceiling; the clamp branch is proved by
  a synthetic state in the unit suite, and the string has never been on screen.
- **No memory entry was written.** The two scars in §6 are stated here rather than
  filed into `~/.claude/projects/.../memory/` — that is the reviewer's file to
  keep, and two sessions writing it concurrently is how it gets clobbered.

---

## 8 · What E1b / the inspector collapse will need from the ledger next round

E1b ("retire the fourth Record Mode") is bound by the recorded always-mounted
scar: inspector prose may only be **retired** where the drawer *provably* already
carries the identical strings. The ledger changes that proof obligation in three
concrete ways.

**What the ledger now provably carries, for a CLOSED site.** The moment's event
title and detail verbatim, the admitted exhibit's title and authored source, the
location's name and its `Location X · closed` citation, the contradiction pair in
the authored words, and every persona line said at that moment. For a closed
location, E1b's "does the drawer already say this" test can now be written against
`buildLedger(state).moments[…]` rather than against `SceneDetailDrawer`'s JSX —
i.e. against a **pure, tested function**, which is a much cheaper equivalence proof
than a DOM diff.

**What it deliberately does not carry, and E1b must decide about.**

1. **The site's own `description` prose.** `recordIndex` puts it in the site
   entry's `body`, but the ledger's filing row prints **title + citation only** (a
   scoping decision, §D4's sibling — a ledger lists what was filed, it does not
   re-print the location's standing description). If E1b wants to retire the
   inspector's description, either the ledger's filing row grows a body for
   `kind === 'site'`, or the Case tab takes it. Either is additive; neither is
   free, and the choice should be made before the inspector is touched.
2. **Anything not yet done.** By contract the ledger holds only what the run has
   put on the record — so it can *never* be the home for the inspector's
   **pre-commit** method prose (the two unfiled methods, their costs, their
   consequences). That prose has no ledger equivalent and never will. E1b's
   collapse must therefore be **phase-gated**, not global: the inspector's job
   genuinely ends only once the site is filed.
3. **A way to get from a site to its moment.** A "narrow spine" implies the spine
   points at something. There is no per-site anchor into the ledger today —
   moments are keyed by event id, and `entriesForEvent` is the only join. A
   `momentForSite(state, siteId)` helper is the obvious next pure addition, and it
   belongs in `ledger.ts` beside `replayAlarm`.

**One constraint E1b and W2-4 both inherit.** The tab bar is now six cells, and
below 700px it wraps to two rows. A **seventh** tab would make it two rows at 1280
as well, or force a scrolling bar — so the mobile record sheet (W2-4) and anything
else that wants a home in the drawer should plan to live *inside* an existing
panel rather than as a new cell.
