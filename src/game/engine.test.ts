import { describe, expect, it } from 'vitest'
import { getCaseContent, getReactionsForSource } from './content'
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

describe('cross-case precedent consequence (Case 81 forge, Case 77 overwrite)', () => {
  // A completed Case 77 run that ends on the forged-hand verdict — the precedent
  // that arms the records-annex watch in Case 81. Built entirely by the engine.
  function case77OverwriteDebrief(): GameState {
    let s = solveReconstruction()
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'forge-authority' })
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    s = gameReducer(s, { type: 'ENTER_TRIBUNAL' })
    return gameReducer(s, { type: 'DECIDE', decisionId: 'overwrite-record' })
  }

  // Open Case 81 off a completed Case 77 run, choose the covert approach, and
  // commit the records-annex forge. Returns the post-commit state.
  function forgeInCase81(case77Run: GameState): GameState {
    let s = gameReducer(case77Run, { type: 'START_CASE', caseId: 'case-81' })
    s = gameReducer(s, { type: 'SELECT_APPROACH', approachId: 'covert' })
    return gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'forge-certification-seal' })
  }

  const base = getCaseContent('case-81').fieldActions.find(
    (action) => action.id === 'forge-certification-seal',
  )

  it('doubles the alarm and swaps in the variant copy when Case 77 was overwritten', () => {
    const overwrite = case77OverwriteDebrief()
    expect(overwrite.precedents).toEqual({ 'case-77': 'overwrite-record' })

    const s = forgeInCase81(overwrite)
    // The forged hand trips two civic traces this time (base action is one).
    expect(s.alarm).toBe(2)

    const event = s.events.at(-1)
    expect(event?.sourceId).toBe('forge-certification-seal')
    expect(event?.tone).toBe('warning')
    // The persisted event detail is the authored variant (acknowledges the watch).
    expect(event?.detail).toContain('Continuity Directorate')
    expect(event?.detail).not.toContain('with no vote at all')

    // The event-log reactions resolve to the variant Defector line.
    const reactions = getReactionsForSource(
      'case-81',
      'field-action',
      'forge-certification-seal',
      s.precedents,
    )
    expect(reactions.find((r) => r.persona === 'defector')?.line).toContain('dead hand')
  })

  it('lands alarm 1 with today’s copy, byte-identical, without the precedent', () => {
    // Open Case 81 off a lawful Case 77 verdict (charter-new-person): no watch.
    const s = forgeInCase81(case77Debrief())
    expect(s.precedents).toEqual({ 'case-77': 'charter-new-person' })
    expect(s.alarm).toBe(1)

    const event = s.events.at(-1)
    expect(event?.sourceId).toBe('forge-certification-seal')
    // The committed detail is exactly the base copy (engine appends only the trust
    // suffix, which is identical because trust deltas are never overridden).
    expect(event?.detail.startsWith(base?.eventDetail ?? '')).toBe(true)
    expect(event?.detail).toContain('with no vote at all')

    // Reactions are the authored base, unchanged.
    const reactions = getReactionsForSource(
      'case-81',
      'field-action',
      'forge-certification-seal',
      s.precedents,
    )
    expect(reactions).toEqual(base?.reactions)
  })
})

describe('deposition (Case 81)', () => {
  // A Case 81 investigation state (an approach already chosen), opened off a
  // completed Case 77 run so the case is available.
  function case81Investigation(approach: 'care' | 'procedure' | 'covert' | 'curiosity'): GameState {
    const opened = gameReducer(case77Debrief(), { type: 'START_CASE', caseId: 'case-81' })
    return gameReducer(opened, { type: 'SELECT_APPROACH', approachId: approach })
  }

  it('commits a sworn deposition: resolves the site, records consent yes, tags care', () => {
    let s = case81Investigation('procedure')
    s = gameReducer(s, {
      type: 'COMMIT_DEPOSITION',
      actionId: 'take-sworn-statement',
      beats: ['corroborate', 'corroborate', 'let-it-stand'],
      askedConsent: true,
    })

    // The underlying field action resolved exactly as a plain commit would.
    expect(s.completedSites).toContain('deposition-suite')
    expect(s.completedActions).toContain('take-sworn-statement')
    expect(s.evidence).toContain('sworn-statement')
    // The transcript persisted; the sworn entry answers 'yes'.
    expect(s.depositionRecord).toEqual({
      actionId: 'take-sworn-statement',
      beats: ['corroborate', 'corroborate', 'let-it-stand'],
      askedConsent: true,
      consent: 'yes',
    })
    // Asking = care; no interrupt means no coercion; base action tags fold in.
    expect(s.methodTags).toEqual(expect.arrayContaining(['procedure', 'care']))
    expect(s.methodTags).not.toContain('coercion')
    // One transcript-path event summarizing the run.
    const event = s.events.at(-1)
    expect(event?.sourceId).toBe('take-sworn-statement')
    expect(event?.detail).toContain('yes')
  })

  it('cross entry answers no when asked; not asking records unasked', () => {
    let asked = case81Investigation('procedure')
    asked = gameReducer(asked, {
      type: 'COMMIT_DEPOSITION',
      actionId: 'cross-examine-witness',
      beats: ['interrupt', 'interrupt', 'interrupt'],
      askedConsent: true,
    })
    expect(asked.depositionRecord?.consent).toBe('no')
    expect(asked.methodTags).toContain('coercion')

    let unasked = case81Investigation('procedure')
    unasked = gameReducer(unasked, {
      type: 'COMMIT_DEPOSITION',
      actionId: 'cross-examine-witness',
      beats: ['let-it-stand', 'let-it-stand', 'let-it-stand'],
      askedConsent: false,
    })
    expect(unasked.depositionRecord?.consent).toBe('unasked')
    expect(unasked.depositionRecord?.askedConsent).toBe(false)
  })

  it('rejects a deposition whose beats or action do not match the authored skeleton', () => {
    const before = case81Investigation('care')
    // Too few beats.
    expect(
      gameReducer(before, {
        type: 'COMMIT_DEPOSITION',
        actionId: 'take-sworn-statement',
        beats: ['corroborate'],
        askedConsent: false,
      }),
    ).toBe(before)
    // A field action that is not a deposition entry action.
    expect(
      gameReducer(before, {
        type: 'COMMIT_DEPOSITION',
        actionId: 'pull-service-record',
        beats: ['corroborate', 'corroborate', 'corroborate'],
        askedConsent: false,
      }),
    ).toBe(before)
  })

  it('is a no-op for a case with no deposition block (Case 77)', () => {
    const before = startInvestigation()
    expect(
      gameReducer(before, {
        type: 'COMMIT_DEPOSITION',
        actionId: 'authenticate-chain',
        beats: ['let-it-stand'],
        askedConsent: false,
      }),
    ).toBe(before)
  })

  it('plays a full strike-testimony run through the deposition to the fifth verdict', () => {
    let s = case81Investigation('care')
    s = gameReducer(s, {
      type: 'COMMIT_DEPOSITION',
      actionId: 'take-sworn-statement',
      beats: ['corroborate', 'let-it-stand', 'corroborate'],
      askedConsent: true,
    })
    s = gameReducer(s, { type: 'OPEN_RECONSTRUCTION' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'oath-cadence' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'unscripted-answer' })
    s = gameReducer(s, { type: 'SUBMIT_RECONSTRUCTION' })
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'pull-service-record' })
    s = gameReducer(s, { type: 'ENTER_TRIBUNAL' })
    s = gameReducer(s, { type: 'DECIDE', decisionId: 'strike-testimony' })

    expect(s.phase).toBe('debrief')
    expect(s.decision).toBe('strike-testimony')
    expect(s.depositionRecord?.consent).toBe('yes')
    // Fifth verdict recorded as the Case 81 precedent; lawful, neutral event.
    expect(s.precedents['case-81']).toBe('strike-testimony')
    const event = s.events.at(-1)
    expect(event?.sourceId).toBe('strike-testimony')
    expect(event?.tone).toBe('neutral')
    expect(event?.methodTags).toEqual(['procedure'])
  })
})
