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
