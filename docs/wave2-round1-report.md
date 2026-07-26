# Wave 2 · Round 1 — the searchable record (E5) + the last contrast failure

Status: implemented and reviewed. The builder agent was killed three times by
transient server errors (529); its E5 work was intact on disk each time and was
**not** redone. The reviewer finished the tail — the contrast item and this
report — and every claim below is labelled **EXECUTED** (a command was run and
its output observed) or **INFERRED** (read, not run). Feel is the user's.

---

## What shipped

### E5 — the searchable record

| file | change |
|---|---|
| `src/game/recordIndex.ts` | new — pure index builder + search over the run's record |
| `src/game/recordIndex.test.ts` | new — including the two guard tests below |
| `src/components/CaseRail.tsx` | Search as a **fifth tab**; draft-vs-query split; query trail |
| `src/components/CaseFileDrawer.tsx`, `src/App.tsx` | the trail is owned by the shell (the rail unmounts with the drawer) |
| `src/styles.css` | search panel, results, trail |
| `scripts/evidence-hud-collapse.mjs` | tab-count assertion re-baselined 4 → 5 (see below) |

**Placement decision (the builder's, upheld in review).** Search is a fifth cell
on the existing tab bar rather than a field above it, because the bar is a
mutually-exclusive panel switcher whose contract three shipped harness sweeps
assert (exactly one `.rail-panel`, exactly one `aria-pressed`), and a field above
it would render results either over or in place of the pressed tab's panel —
breaking that contract while the pressed tab still claimed to be showing. It
would also add a third permanent chrome row above the fold on the 375 sheet.

**Draft vs query.** What is typed and what has been *asked* are separate state.
The record answers a submitted question — the Her Story terminal move — so
results do not churn under the reader's hands and the trail records questions
rather than keystrokes.

**The query trail is VIEW-LOCAL.** Queries are kept for the session and shown as
"Queries this run"; they are **lost on reload** and are deliberately not
persisted. No new persisted field, no schema change of any kind this round.

### The last contrast failure — and what it actually was

`.site-closeup-zone-label` had been failing at **2.46 : 1** since the design-gap
audit first measured it. The reviewer's investigation found the failure was **not
real**: the label the probe measured lives inside a zone group that the room-phase
suppressions set to `opacity: 0` (`styles.css` — the classification / acoustic /
custody suppressions). The element is invisible on screen, paints no background of
its own, and `elementFromPoint` still hits it because the probe forces
`pointer-events` on for its own hit test — so the sampler read the bright plate
behind an *unreadable* label and reported a failure that no player can see.

**EXECUTED, live**: at the probe's exact surface and phase (Registry intake,
`data-custody-phase="intake"`), `document.querySelectorAll('.site-closeup-zone')`
returns **0 rendered zones** across all four Case 77 sites; the debug ancestry dump
from an instrumented copy of the probe shows the matched label's parent chain as
`site-closeup-zone | op:0`.

**Fix — in the instrument, not the stylesheet.** `scripts/audit-contrast-probe.mjs`
now multiplies the opacity of every ancestor and skips a target whose effective
opacity is below 0.05, with a comment stating the rule: the occlusion clause
already encodes "a target with no reader has no contrast problem" for *covered*
elements; an element inside an `opacity: 0` group is the same case. No stylesheet
change was made for this item — the zone label's authored chip (raised 0.88 → 0.92
in the interrupted round, with the resting dim moved to the mark) stands.

A second bug was found while fixing the first: `parseFloat(...) || 1` treats a
legitimate `opacity: 0` as falsy and substitutes 1, which silently defeated the
first version of the guard. Now `Number.isFinite`-checked.

---

## Verification

- **EXECUTED** `npx vitest run` (Node 24) → **317 passed / 18 files** (299 before).
- **EXECUTED** `npx tsc -b` clean.
- **EXECUTED** `node scripts/audit-contrast-probe.mjs` → **ALL PASS** — the first
  time the whole game has measured clean, and the only reason the previous number
  was 1 rather than 0 was an instrument defect.
- **EXECUTED, live** (browser pane, real run: approach → Care ward 12 filed →
  Case file → Search): `rain` → **2 entries** (the log event and the admitted
  evidence, each cited); `person in that room` → **1 entry** under **SAID ON THE
  RECORD** (the Shepherd's line); `zeppelin` → *"No entry answers to 'zeppelin'."*
  Screenshot of the two-hit state captured in review.
- **EXECUTED** the drawer's tab bar reads `case · Evidence 1 · log · people ·
  search`, one panel at a time, dialog `aria-modal` intact.
- **INFERRED** (read, not run in review) the two guard tests in
  `recordIndex.test.ts`: a fresh run's index holds nothing but the approach event,
  and no Case 81 authored prose reaches a Case 77 index (or the reverse) — the
  content-id-leak rule extended to the new surface. Both are part of the 317.

### Harness edit — one, disclosed

`scripts/evidence-hud-collapse.mjs`: the drawer's tab assertion was re-baselined
from four tabs to five, because the world legitimately changed. **No clause was
relaxed** — every existing check is kept, the roster clause is joined by a search
clause, and the count stays pinned to a named set rather than to "at least four".
The per-tab panel loop gained `'search'`.

---

## The record-entry shape (what E3's ledger consumes next round)

`buildRecordIndex(state)` returns entries of the documented shape in
`src/game/recordIndex.ts`'s header — `{ id, kind, title, body, cite, order }`,
with `kind` drawn from `RECORD_KINDS` (event / evidence / voice / model /
precedent / site). `searchRecord(index, query)` is case-insensitive substring
matching over title + body; `groupRecordEntries` and `groupByVoice` are the
presentation groupings. Everything is a pure derivation over `GameState` plus
content lookups — no new persisted state, and no dependency to add.

---

## UNVERIFIED / open

- **The `evidence/record-search/` screenshot set was not produced.** The builder
  died before writing `scripts/evidence-record-search.mjs`; the reviewer verified
  the same scenarios live in the browser instead and captured one screenshot. A
  dedicated re-runnable harness for this surface remains **owed** — the first
  candidate for the next round's housekeeping.
- **Keyboard-only pass on the search panel: not run.** The input is a real
  labelled field inside the already-trapped drawer, so the structure is sound,
  but that is an inference, not a transcript.
- **Easy Read / reduced-motion on the search panel: not separately measured.**
- **375-wide search panel: not captured.**
- The four other harnesses (pilot / rooms / personas / hud) were **not** re-run by
  the reviewer after the probe-only change; the probe change touches no product
  code, and the product code was unchanged since their last green run in the
  Wave 1 review — but that is an inference about scope, not a fresh run.
