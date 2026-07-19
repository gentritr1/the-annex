import { describe, expect, it } from 'vitest'
import { canEnterTribunal, createInitialGameState, gameReducer } from './engine'
import type { GameState } from './types'

function startInvestigation() {
  const initial = createInitialGameState()
  const briefing = gameReducer(initial, { type: 'START_NEW' })
  return gameReducer(briefing, { type: 'SELECT_APPROACH', approachId: 'care' })
}

// Play a briefing state through to a debrief verdict in one call.
function playRunToDebrief(briefing: GameState): GameState {
  let s = gameReducer(briefing, { type: 'SELECT_APPROACH', approachId: 'care' })
  s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
  s = gameReducer(s, { type: 'OPEN_RECONSTRUCTION' })
  s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'scar-sensation' })
  s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'witness-account' })
  s = gameReducer(s, { type: 'SUBMIT_RECONSTRUCTION' })
  s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
  s = gameReducer(s, { type: 'ENTER_TRIBUNAL' })
  return gameReducer(s, { type: 'DECIDE', decisionId: 'certify-continuity' })
}

function solveReconstruction(state = startInvestigation()) {
  let next = state
  if (next.completedSites.length === 0) {
    next = gameReducer(next, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
  }
  next = gameReducer(next, { type: 'OPEN_RECONSTRUCTION' })
  next = gameReducer(next, { type: 'TOGGLE_FRAGMENT', fragmentId: 'scar-sensation' })
  next = gameReducer(next, { type: 'TOGGLE_FRAGMENT', fragmentId: 'witness-account' })
  return gameReducer(next, { type: 'SUBMIT_RECONSTRUCTION' })
}

describe('gameReducer', () => {
  it('accepts only one action per site', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    const afterFirstAction = state
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'stress-test' })

    expect(state).toBe(afterFirstAction)
    expect(state.evidence).toEqual(['sensory-echo'])
  })

  it('requires two field sites and a reconstruction before tribunal', () => {
    let state = solveReconstruction()
    expect(canEnterTribunal(state)).toBe(false)

    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'walk-acoustic-shadow' })

    expect(canEnterTribunal(state)).toBe(true)
  })

  it('keeps a reconstruction unresolved until exactly two anchors are selected', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'trace-checksum' })
    state = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'registry-hash' })
    const oneAnchor = gameReducer(state, { type: 'SUBMIT_RECONSTRUCTION' })

    expect(oneAnchor.phase).toBe('reconstruction')
    expect(oneAnchor.reconstruction).toBeNull()
  })

  it('records how many selected anchors the field route corroborated', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    state = solveReconstruction(state)

    expect(state.events.at(-1)?.detail).toContain('2 of 2 anchors were corroborated')
  })

  it('requires field evidence before opening the memory lattice', () => {
    const state = startInvestigation()
    const unchanged = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })

    expect(unchanged).toBe(state)
  })

  it('locks the forged resolution unless the maintenance override was acquired', () => {
    let state = solveReconstruction()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
    state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
    const withoutOverride = gameReducer(state, { type: 'DECIDE', decisionId: 'overwrite-record' })

    expect(withoutOverride.phase).toBe('tribunal')

    let overrideState = solveReconstruction()
    overrideState = gameReducer(overrideState, {
      type: 'COMMIT_FIELD_ACTION',
      actionId: 'forge-authority',
    })
    overrideState = gameReducer(overrideState, {
      type: 'COMMIT_FIELD_ACTION',
      actionId: 'listen-mara',
    })
    overrideState = gameReducer(overrideState, { type: 'ENTER_TRIBUNAL' })
    overrideState = gameReducer(overrideState, {
      type: 'DECIDE',
      decisionId: 'overwrite-record',
    })

    expect(overrideState.phase).toBe('debrief')
    expect(overrideState.decision).toBe('overwrite-record')
  })

  it('tags the forged Case 77 finding as fraud/systems with a warning event', () => {
    let state = solveReconstruction()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'forge-authority' })
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
    state = gameReducer(state, { type: 'DECIDE', decisionId: 'overwrite-record' })

    expect(state.decision).toBe('overwrite-record')
    expect(state.methodTags).toEqual(expect.arrayContaining(['fraud', 'systems']))
    const event = state.events.at(-1)
    expect(event?.sourceId).toBe('overwrite-record')
    expect(event?.tone).toBe('warning')
    expect(event?.methodTags).toEqual(expect.arrayContaining(['fraud', 'systems']))
  })

  it('tags a lawful Case 77 finding as procedure with a neutral event', () => {
    let state = solveReconstruction()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
    state = gameReducer(state, { type: 'DECIDE', decisionId: 'certify-continuity' })

    const event = state.events.at(-1)
    expect(event?.sourceId).toBe('certify-continuity')
    expect(event?.tone).toBe('neutral')
    expect(event?.methodTags).toEqual(['procedure'])
  })

  it('carries a compact run summary into the next loop', () => {
    let state = solveReconstruction()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
    state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
    state = gameReducer(state, { type: 'DECIDE', decisionId: 'charter-new-person' })
    state = gameReducer(state, { type: 'START_NEXT_RUN' })

    expect(state.runNumber).toBe(2)
    expect(state.previousRuns).toHaveLength(1)
    expect(state.previousRuns[0]?.decision).toBe('charter-new-person')
    expect(state.evidence).toHaveLength(0)
  })

  it('turns prior social trust into bounded residue on the next approach', () => {
    let state = solveReconstruction()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
    state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
    state = gameReducer(state, { type: 'DECIDE', decisionId: 'charter-new-person' })
    state = gameReducer(state, { type: 'START_NEXT_RUN' })
    state = gameReducer(state, { type: 'SELECT_APPROACH', approachId: 'procedure' })

    expect(state.trust.shepherd).toBe(1)
    expect(state.trust.registrar).toBe(2)
    expect(state.events[0]?.detail).toContain('retain traces')
  })

  it('records the run verdict as the case precedent, not before', () => {
    let state = solveReconstruction()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })

    expect(state.caseId).toBe('case-77')
    expect(state.precedents).toEqual({})

    state = gameReducer(state, { type: 'DECIDE', decisionId: 'charter-new-person' })

    expect(state.precedents).toEqual({ 'case-77': 'charter-new-person' })
  })

  it('starts a fresh game with no precedents and the current case id', () => {
    const fresh = gameReducer(createInitialGameState(), { type: 'START_NEW' })

    expect(fresh.caseId).toBe('case-77')
    expect(fresh.precedents).toEqual({})
  })

  it('caps carried run history at twenty and keeps the most recent runs', () => {
    let state = gameReducer(createInitialGameState(), { type: 'START_NEW' })
    for (let i = 0; i < 22; i++) {
      state = playRunToDebrief(state)
      state = gameReducer(state, { type: 'START_NEXT_RUN' })
    }

    expect(state.runNumber).toBe(23)
    expect(state.previousRuns).toHaveLength(20)
    expect(state.previousRuns.at(-1)?.runNumber).toBe(22)
    expect(state.previousRuns[0]?.runNumber).toBe(3)
    // The precedent from the last decided run persists across the cap.
    expect(state.precedents).toEqual({ 'case-77': 'certify-continuity' })
  })

  it('records the trust cause of a field action in the event log', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'stress-test' })

    const detail = state.events.at(-1)?.detail ?? ''
    expect(detail).toContain('Registrar +1')
    expect(detail).toContain('Shepherd −2')
  })

  it('names carried-over personas as residue on the next run approach', () => {
    let state = solveReconstruction()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
    state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
    state = gameReducer(state, { type: 'DECIDE', decisionId: 'charter-new-person' })
    state = gameReducer(state, { type: 'START_NEXT_RUN' })
    state = gameReducer(state, { type: 'SELECT_APPROACH', approachId: 'procedure' })

    const detail = state.events[0]?.detail ?? ''
    expect(detail).toContain('Residue:')
    expect(detail).toContain('Shepherd +1')
  })
})

// A completed Case 77 run at debrief, with charter-new-person recorded — the
// precedent Case 81's tribunal cites and the gate the selection flow reads.
function case77Debrief(): GameState {
  let state = solveReconstruction()
  state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
  state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
  state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
  return gameReducer(state, { type: 'DECIDE', decisionId: 'charter-new-person' })
}

describe('START_CASE (multi-case)', () => {
  it('ignores an unregistered case id', () => {
    const debrief = case77Debrief()
    const unchanged = gameReducer(debrief, { type: 'START_CASE', caseId: 'case-404' })
    expect(unchanged).toBe(debrief)
  })

  it('opens Case 81 from a completed Case 77 run, carrying precedent, history, and the loop counter', () => {
    const debrief = case77Debrief()
    expect(debrief.runNumber).toBe(1)

    const opened = gameReducer(debrief, { type: 'START_CASE', caseId: 'case-81' })

    expect(opened.caseId).toBe('case-81')
    expect(opened.phase).toBe('briefing')
    // Precedent from the Case 77 verdict persists.
    expect(opened.precedents).toEqual({ 'case-77': 'charter-new-person' })
    // The completed Case 77 run folded into history, stamped with its case.
    expect(opened.previousRuns).toHaveLength(1)
    expect(opened.previousRuns[0]?.caseId).toBe('case-77')
    expect(opened.previousRuns[0]?.decision).toBe('charter-new-person')
    // Global loop counter advances, never resets.
    expect(opened.runNumber).toBe(2)
    // Fresh run: no case-77 field state leaks in.
    expect(opened.evidence).toHaveLength(0)
    expect(opened.completedSites).toHaveLength(0)
    expect(opened.announcement).toContain('Case 81')
  })

  it('carries Case 77 trust residue into Case 81 (the personas cross cases)', () => {
    const opened = gameReducer(case77Debrief(), { type: 'START_CASE', caseId: 'case-81' })
    // care approach in Case 77 left shepherd high (+3), so residue grants +1.
    const withApproach = gameReducer(opened, { type: 'SELECT_APPROACH', approachId: 'procedure' })

    expect(withApproach.caseId).toBe('case-81')
    const detail = withApproach.events[0]?.detail ?? ''
    expect(detail).toContain('Residue:')
    expect(detail).toContain('Shepherd +1')
    expect(withApproach.trust.shepherd).toBeGreaterThanOrEqual(1)
  })

  it('does not fold an incomplete current run into history and keeps the counter', () => {
    // Mid-investigation (no decision): switching cases carries history untouched.
    const mid = startInvestigation()
    expect(mid.runNumber).toBe(1)

    const opened = gameReducer(mid, { type: 'START_CASE', caseId: 'case-81' })

    expect(opened.caseId).toBe('case-81')
    expect(opened.previousRuns).toHaveLength(0)
    expect(opened.runNumber).toBe(1)
    expect(opened.precedents).toEqual({})
  })

  it('never destroys Case 77 progress: START_CASE back to case-77 works symmetrically', () => {
    const opened81 = gameReducer(case77Debrief(), { type: 'START_CASE', caseId: 'case-81' })
    const back77 = gameReducer(opened81, { type: 'START_CASE', caseId: 'case-77' })

    expect(back77.caseId).toBe('case-77')
    // Precedent and run history survive the round trip.
    expect(back77.precedents).toEqual({ 'case-77': 'charter-new-person' })
    expect(back77.previousRuns).toHaveLength(1)
    expect(back77.previousRuns[0]?.caseId).toBe('case-77')
  })

  it('plays a full Case 81 run through the shared engine to a verdict', () => {
    let s = gameReducer(case77Debrief(), { type: 'START_CASE', caseId: 'case-81' })
    s = gameReducer(s, { type: 'SELECT_APPROACH', approachId: 'care' })
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'take-sworn-statement' })
    s = gameReducer(s, { type: 'OPEN_RECONSTRUCTION' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'oath-cadence' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'unscripted-answer' })
    s = gameReducer(s, { type: 'SUBMIT_RECONSTRUCTION' })
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'pull-service-record' })
    s = gameReducer(s, { type: 'ENTER_TRIBUNAL' })
    s = gameReducer(s, { type: 'DECIDE', decisionId: 'certify-witness' })

    expect(s.phase).toBe('debrief')
    expect(s.reconstruction).toBe('testimonial-standing')
    expect(s.decision).toBe('certify-witness')
    // Case 81 verdict recorded under its own case; Case 77's precedent untouched.
    expect(s.precedents).toEqual({ 'case-77': 'charter-new-person', 'case-81': 'certify-witness' })
  })

  it('gates Case 81 availability on a recorded Case 77 precedent', () => {
    // The selection flow reads precedents['case-77']; model that predicate here.
    const available = (state: GameState) => Boolean(state.precedents['case-77'])

    const fresh = gameReducer(createInitialGameState(), { type: 'START_NEW' })
    expect(available(fresh)).toBe(false)
    expect(available(case77Debrief())).toBe(true)
  })
})

describe('authored decision & reconstruction semantics (Case 81)', () => {
  // Reach Case 81's tribunal with the forged seal acquired, two sites filed, and
  // a model on record — the Case 81 analogue of Case 77's forged-authority path.
  function case81Tribunal(): GameState {
    let s = gameReducer(case77Debrief(), { type: 'START_CASE', caseId: 'case-81' })
    s = gameReducer(s, { type: 'SELECT_APPROACH', approachId: 'covert' })
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'forge-certification-seal' })
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'take-sworn-statement' })
    s = gameReducer(s, { type: 'OPEN_RECONSTRUCTION' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'oath-cadence' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'unscripted-answer' })
    s = gameReducer(s, { type: 'SUBMIT_RECONSTRUCTION' })
    return gameReducer(s, { type: 'ENTER_TRIBUNAL' })
  }

  it('tags the forged seal-certification finding as fraud/systems with a warning event', () => {
    const tribunal = case81Tribunal()
    expect(tribunal.phase).toBe('tribunal')
    expect(tribunal.tribunalOverride).toBe(true)

    const decided = gameReducer(tribunal, { type: 'DECIDE', decisionId: 'seal-certification' })

    expect(decided.phase).toBe('debrief')
    expect(decided.decision).toBe('seal-certification')
    expect(decided.methodTags).toEqual(expect.arrayContaining(['fraud', 'systems']))
    const event = decided.events.at(-1)
    expect(event?.sourceId).toBe('seal-certification')
    expect(event?.tone).toBe('warning')
    expect(event?.methodTags).toEqual(expect.arrayContaining(['fraud', 'systems']))
  })

  it('tags a lawful Case 81 finding as procedure with a neutral event', () => {
    const decided = gameReducer(case81Tribunal(), {
      type: 'DECIDE',
      decisionId: 'certify-witness',
    })

    const event = decided.events.at(-1)
    expect(event?.sourceId).toBe('certify-witness')
    expect(event?.tone).toBe('neutral')
    expect(event?.methodTags).toEqual(['procedure'])
  })

  it('gives Case 81 standing-deadlock a warning tone even when an anchor is corroborated', () => {
    let s = gameReducer(case77Debrief(), { type: 'START_CASE', caseId: 'case-81' })
    s = gameReducer(s, { type: 'SELECT_APPROACH', approachId: 'procedure' })
    // Auditing the restoration log corroborates 'redacted-clause' (its links
    // include 'restoration-log'), so the warning must come from the authored
    // unresolvedTone flag, not the corroboratedAnchors === 0 fallback.
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'audit-restoration-log' })
    s = gameReducer(s, { type: 'OPEN_RECONSTRUCTION' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'redacted-clause' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'unscripted-answer' })
    s = gameReducer(s, { type: 'SUBMIT_RECONSTRUCTION' })

    expect(s.reconstruction).toBe('standing-deadlock')
    const event = s.events.at(-1)
    expect(event?.detail).toContain('1 of 2 anchors were corroborated')
    expect(event?.tone).toBe('warning')
  })
})
