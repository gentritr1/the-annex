import type { GameState } from '../game/types'

// W1-4 — the purpose copy. The audit's heuristic-#10 finding is that the chrome
// names a STATE (`0 / 2 · SITES`, `Needed · MODEL`) and never a PURPOSE: a
// first-timer can read every control and still miss what the run is for
// (design-gap-audit-2026-07.md:110–117, P2-F).
//
// Five lines live here, one per moment where "why" is missing. They are UI
// chrome, not narrative content: nothing in this file is authored case content,
// nothing is reachable from a CaseDefinition, and nothing enters the reducer.
//
// TWO HARD RULES, both from the brief:
//
// 1. NO NEW PERSISTED FIELD. Every retirement predicate below is DERIVED from
//    GameState fields that already persist (`previousRuns`, `completedSites`,
//    `reconstruction`, `evidence`, `events`). `decodeGameState` rejects a save
//    whole if its settings blob fails (persistence.ts:355–356), so an added
//    field is a wipe risk; there is no added field here and no schema bump.
//
// 2. RETIREMENT, NOT LABELLING. Each line appears at the moment it becomes true
//    and never returns in that run. The shipped precedent is `.field-threshold`
//    (Investigation.tsx), which holds until the first site is filed and then
//    goes — copy that becomes noise once understood must leave on its own.
//
// The shared gate is `isFirstCase`: a player carrying a completed run has been
// told once already, so no line renders for them at all. That keeps the glyph
// budget of every replay exactly where the typography pass left it.

export function isFirstCase(state: GameState): boolean {
  return state.previousRuns.length === 0
}

/** The concourse arc line — rides with `.field-threshold`, retires with it. */
export function showsFieldPurpose(state: GameState): boolean {
  return isFirstCase(state) && state.completedSites.length === 0
}

/** The cost of committing at a bounded-room location. Retires at the first filing. */
export function showsSiteCost(state: GameState): boolean {
  return isFirstCase(state) && state.completedSites.length === 0
}

/** What the case file is for, while it holds nothing yet. Retires at the first record.
 *
 * Gated on ADMITTED EVIDENCE, not on the event count, and that is a corrected
 * bug rather than a preference. `SELECT_APPROACH` appends an event
 * (`engine.ts:255`), so by the time a real player reaches the concourse the log
 * already holds one entry and an `eventCount === 0` gate is never true in play.
 * The first draft used it, and a seeded save with `events: []` — a state the
 * game does not produce at this phase — made the harness agree. Caught only
 * because the contrast probe, which walks the game the way a player does,
 * reported no such element to measure. */
export function showsCaseFilePurpose(state: GameState, evidenceCount: number): boolean {
  return isFirstCase(state) && evidenceCount === 0
}

/** What the lattice is for. Retires the moment a model is filed. */
export function showsLatticePurpose(state: GameState): boolean {
  return isFirstCase(state) && state.reconstruction === null
}

/** What the roster holds. Retires at the first filing, with the field lines. */
export function showsRosterPurpose(state: GameState): boolean {
  return isFirstCase(state) && state.completedSites.length === 0
}

// The strings. One sentence each, present tense, no tutorial voice, no gamey
// idiom, curly punctuation only. DRAFTED BY THE BUILDER FOR REDLINE —
// docs/w1-4-purpose-copy-report.md carries the table the user edits.
export const purposeCopy = {
  // Moment: first arrival at the concourse, under the existing threshold line.
  field:
    'Those two become a model, the model becomes a ruling, and the next case inherits the ruling.',
  // Moment: a bounded-room location, before anything has been filed.
  siteCost: 'One method files this location — the other stays unread for the rest of the run.',
  // Moment: the case file holds nothing yet.
  caseFile: 'The tribunal reads only what is filed here.',
  // Moment: the memory lattice, before a model exists.
  lattice:
    'The tribunal will not hear findings without a model of what happened — the pair you file is what speaks there.',
  // Moment: the roster, before the first filing.
  roster: 'Their standing moves with your route, and what they will give you moves with it.',
} as const
