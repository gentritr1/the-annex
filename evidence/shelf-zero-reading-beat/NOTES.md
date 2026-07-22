# Shelf Zero reading beat — evidence notes

The Small Archive's restriction log no longer rushes its own discovery off stage.

## What changed in the pacing

Before this pass, the instant a single slip was turned the room flipped to
`unlocked`: the log unmounted after ONE click, the other two slips became
unreachable, and the only surviving trace of the turned fragment was the
`.room-announce` line, clipped at ~3.3em. The room's central discovery — reading
what the institution erased — was over before it registered.

Now the log holds a deliberate **reading beat**:

1. A short authored lead frames the slips.
2. **Three compact slip tabs** sit in one fixed row (real buttons, ≥44px targets).
   They stay mounted for the whole beat, so turning one is never an unmount hole.
   Turned tabs read `Turned`; the one whose fragment is on screen reads `Reading`
   and is distinct beyond colour (a solid keyline + inset ring, plus `aria-current`).
3. A **stable reading area** (fixed, flexed height — constant across selections)
   shows the selected slip's complete fragment. Every one of the three authored
   fragments fits fully, with no clipping and no inner scroll (measured: reading
   box `clientHeight === scrollHeight` for all three at 1280×800 and at 375px).
4. A **proceed control** ("Take your reading to the Archivist") appears in a slot
   RESERVED from the log's first render, so the height never jumps. It is revealed
   only once the room is canonically unlocked. Reading all three slips stays
   optional — one turn is enough to proceed.

The methods appear **only after** the player acknowledges the beat via proceed.
Before that, the `.choice-row` count inside the room is 0 even with all three slips
turned.

## What did NOT change

- The canonical unlock rule `roomUnlocked(state)` is byte-identical:
  `cardOnShelfZero && turnedSlips.length >= 1`. Proceeding is a view-level phase
  swap, never a second gate — `canProceed(state) === roomUnlocked(state)`.
- The two canonical methods, their ids, copy, outcomes, and commit path are
  untouched; both return outcomes (opened / sealed) resolve exactly as before.
- The room reducer stays pure / deterministic / serializable; nothing is persisted.

## Focus & live region

- Turning or re-selecting a slip hands focus to the reading area (never `<body>`).
- Activating proceed swaps the tableau to methods and focuses the first method.
- The focus-fallback chain gained the reading area and proceed control at their
  lifecycle positions, so no transition in the beat can strand focus on `<body>`.
- `.room-announce` remains the single live region for the whole room. In the log
  and unlocked phases it becomes sr-only (still present and polite) because the
  reading area (log) and the unlock line + methods (unlocked) carry the visible
  text — freeing its reserved height for the reading area and the larger method
  type. Exactly one `[aria-live]`/`[role="status"]` element exists in every phase.

## Small visual corrections in the same pass

1. The empty reserved fourth cell reads as a recessed cut slot in the desk (inset
   keyline + shadow) before shelf zero appears — no label, no hover/focus affordance.
2. The plate's PROCEDURE / INQUIRY zone markers are suppressed while the room is
   active and the phase is not `unlocked`; they return with the methods.
3. The method description / consequence type is raised (description 0.78rem,
   consequence 0.70rem), scoped under `.classification-room` so shared
   `ChoiceButton` surfaces elsewhere are untouched. Both methods + the unlock line
   still fit the 384px stage with zero inspector overflow at 1280×800.
4. The active card drops the generic amber left stripe for a document-native
   treatment: a full thin keyline plus a dog-eared corner-fold (built from existing
   palette surfaces). High-contrast keeps a non-colour outline cue.

## Host note (headless Chrome)

Per the project host warning, headless Chrome on this Mac wedges randomly at the
process level mid-session (`CDP timeout` on an arbitrary evaluate; the wedge point
moves between runs and is not an app bug). Any incomplete harness run is recorded
honestly (`complete: false`, `incompleteReason` set). The reading-beat mechanics —
per-phase 384px height and zero overflow, one live region per phase, per-fragment
readability, focus handoff (slip→reading, proceed→method, never `<body>`), the
methods-gated-on-proceed rule, the raised type, and the suppressed plate markers —
were additionally cross-checked against the live runtime DOM in the Vite app and
are covered by the unit tests in `src/game/room.test.ts` and
`src/game/content.test.ts`.
