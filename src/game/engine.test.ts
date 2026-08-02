import { describe, expect, it } from 'vitest'
import { getCaseContent, getReactionsForSource } from './content'
import {
  canDiscoverSecret,
  canEnterTribunal,
  canOpenReconstruction,
  createInitialGameState,
  getReconstructionPreview,
  gameReducer,
  getFragmentKnowledge,
  hasDiscoveredSecret,
  isValidReconstructionPair,
} from './engine'
import type { GameState } from './types'

function startInvestigation() {
  const initial = createInitialGameState()
  const briefing = gameReducer(initial, { type: 'START_NEW' })
  return gameReducer(briefing, { type: 'SELECT_APPROACH', approachId: 'care' })
}

function setCase77Scope(state: GameState, choiceId: 'individual' | 'general' = 'individual') {
  return gameReducer(state, { type: 'SET_TRIBUNAL_CHOICE', choiceId })
}

// Play a briefing state through to a debrief verdict in one call.
function playRunToDebrief(briefing: GameState): GameState {
  let s = gameReducer(briefing, { type: 'SELECT_APPROACH', approachId: 'care' })
  s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
  s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
  s = gameReducer(s, { type: 'OPEN_RECONSTRUCTION' })
  s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'witness-account' })
  s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'registry-hash' })
  s = gameReducer(s, { type: 'SUBMIT_RECONSTRUCTION' })
  s = gameReducer(s, { type: 'ENTER_TRIBUNAL' })
  s = setCase77Scope(s)
  return gameReducer(s, { type: 'DECIDE', decisionId: 'certify-continuity' })
}

function solveReconstruction(state = startInvestigation()) {
  let next = state
  for (const actionId of ['authenticate-chain', 'listen-mara'] as const) {
    if (!next.completedActions.includes(actionId) && next.completedSites.length < 2) {
      next = gameReducer(next, { type: 'COMMIT_FIELD_ACTION', actionId })
    }
  }
  const fragments = getCaseContent(next.caseId).fragments
  let selectedPair: readonly [string, string] | null = null
  for (let left = 0; left < fragments.length && !selectedPair; left += 1) {
    for (let right = left + 1; right < fragments.length; right += 1) {
      const first = fragments[left]
      const second = fragments[right]
      if (first && second && isValidReconstructionPair(next, [first.id, second.id])) {
        selectedPair = [first.id, second.id]
        break
      }
    }
  }
  if (!selectedPair) throw new Error('Expected a valid Case 77 reconstruction pair')
  next = gameReducer(next, { type: 'OPEN_RECONSTRUCTION' })
  next = gameReducer(next, { type: 'TOGGLE_FRAGMENT', fragmentId: selectedPair[0] })
  next = gameReducer(next, { type: 'TOGGLE_FRAGMENT', fragmentId: selectedPair[1] })
  return gameReducer(next, { type: 'SUBMIT_RECONSTRUCTION' })
}

function decideCase77(
  actionIds: readonly string[],
  scope: 'individual' | 'general' = 'individual',
  decisionId = 'certify-continuity',
): GameState {
  let state = startInvestigation()
  actionIds.forEach((actionId) => {
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId })
  })
  state = solveReconstruction(state)
  state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
  state = setCase77Scope(state, scope)
  return gameReducer(state, { type: 'DECIDE', decisionId })
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

  it('caps newly filed Case 77 sites at the authored limit before any third-action effect', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    const beforeThirdSite = state

    const rejected = gameReducer(state, {
      type: 'COMMIT_FIELD_ACTION',
      actionId: 'forge-authority',
    })

    expect(rejected).toBe(beforeThirdSite)
    expect(rejected.tribunalOverride).toBe(false)
    expect(rejected.alarm).toBe(beforeThirdSite.alarm)
  })

  it('caps a Case 81 deposition before transcript, trust, and evidence effects', () => {
    let state = gameReducer(startInvestigation(), { type: 'START_CASE', caseId: 'case-81' })
    state = gameReducer(state, { type: 'SELECT_APPROACH', approachId: 'procedure' })
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'audit-restoration-log' })
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'pull-service-record' })
    const beforeThirdSite = state

    const rejected = gameReducer(state, {
      type: 'COMMIT_DEPOSITION',
      actionId: 'take-sworn-statement',
      beats: ['corroborate', 'corroborate'],
      askedConsent: true,
    })

    expect(rejected).toBe(beforeThirdSite)
    expect(rejected.depositionRecord).toBeNull()
  })

  it('keeps historical three- and four-site records reconstructable and tribunal-eligible without new filings', () => {
    let twoSiteState = startInvestigation()
    twoSiteState = gameReducer(twoSiteState, {
      type: 'COMMIT_FIELD_ACTION',
      actionId: 'authenticate-chain',
    })
    twoSiteState = gameReducer(twoSiteState, {
      type: 'COMMIT_FIELD_ACTION',
      actionId: 'listen-mara',
    })
    const historical: GameState = {
      ...twoSiteState,
      completedSites: ['registry', 'care-ward', 'maintenance', 'small-archive'],
      completedActions: [
        'authenticate-chain',
        'listen-mara',
        'walk-acoustic-shadow',
        'answer-archivist',
      ],
      evidence: ['custody-chain', 'sensory-echo', 'sensor-omission', 'missing-category'],
    }
    const historicalSnapshot = JSON.stringify(historical)

    expect(canOpenReconstruction(historical)).toBe(true)
    let reconstructed = gameReducer(historical, { type: 'OPEN_RECONSTRUCTION' })
    reconstructed = gameReducer(reconstructed, {
      type: 'TOGGLE_FRAGMENT',
      fragmentId: 'witness-account',
    })
    reconstructed = gameReducer(reconstructed, {
      type: 'TOGGLE_FRAGMENT',
      fragmentId: 'registry-hash',
    })
    reconstructed = gameReducer(reconstructed, { type: 'SUBMIT_RECONSTRUCTION' })

    expect(canEnterTribunal(reconstructed)).toBe(true)
    expect(
      gameReducer(reconstructed, {
        type: 'COMMIT_FIELD_ACTION',
        actionId: 'forge-authority',
      }),
    ).toBe(reconstructed)
    expect(JSON.stringify(historical)).toBe(historicalSnapshot)
  })

  it('requires two field sites and a reconstruction before tribunal', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
    expect(canEnterTribunal(state)).toBe(false)

    state = solveReconstruction(state)

    expect(canEnterTribunal(state)).toBe(true)
  })

  it('keeps a reconstruction unresolved until exactly two anchors are selected', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'trace-checksum' })
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
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

  it('previews only the authored reconstruction argument that the submitted pair files', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    const pair = ['new-dream', 'registry-hash'] as const
    const preview = getReconstructionPreview(state, pair)

    expect(preview).toMatchObject({
      modelId: 'emergent-self',
      title: 'Emergent personhood',
      corroboratedAnchors: 1,
      supportStatus: 'one corroborated anchor',
    })
    expect(preview?.thesis.length).toBeGreaterThan(0)
    expect(preview?.limitation.length).toBeGreaterThan(0)
    expect(Object.keys(preview ?? {})).toEqual([
      'modelId',
      'title',
      'thesis',
      'limitation',
      'corroboratedAnchors',
      'supportStatus',
    ])

    state = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: pair[0] })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: pair[1] })
    state = gameReducer(state, { type: 'SUBMIT_RECONSTRUCTION' })
    expect(state.reconstruction).toBe(preview?.modelId)
  })

  it('requires field evidence before opening the memory lattice', () => {
    const state = startInvestigation()
    const unchanged = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })

    expect(unchanged).toBe(state)
  })

  it('derives unknown, discovered, and corroborated anchors from action-specific filed sources', () => {
    let state = startInvestigation()
    expect(getFragmentKnowledge(state, 'scar-sensation')).toBe('unknown')

    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })

    // The authenticated receipt exposes its own two anchors. The hash is backed
    // by custody; the post-restoration dream has no filed supporting evidence.
    expect(getFragmentKnowledge(state, 'scar-sensation')).toBe('unknown')
    expect(getFragmentKnowledge(state, 'registry-hash')).toBe('corroborated')
    expect(getFragmentKnowledge(state, 'new-dream')).toBe('discovered')
    expect(getFragmentKnowledge(state, 'witness-account')).toBe('unknown')
    expect(canOpenReconstruction(state)).toBe(false)
  })

  it('validates only distinct, local, known pairs with at least one corroborated anchor', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })

    expect(isValidReconstructionPair(state, ['new-dream', 'registry-hash'])).toBe(true)
    expect(isValidReconstructionPair(state, ['new-dream', 'new-dream'])).toBe(false)
    expect(isValidReconstructionPair(state, ['new-dream', 'oath-cadence'])).toBe(false)
    expect(isValidReconstructionPair(state, ['new-dream', 'witness-account'])).toBe(false)

    const knownWithoutEvidence: GameState = {
      ...state,
      completedSites: ['registry', 'care-ward'],
      completedActions: ['authenticate-chain', 'listen-mara'],
      evidence: [],
    }
    expect(
      isValidReconstructionPair(knownWithoutEvidence, ['new-dream', 'witness-account']),
    ).toBe(false)
  })

  it('does not open a lattice before the second field site is filed', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'walk-acoustic-shadow' })
    const unchanged = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })

    expect(canOpenReconstruction(state)).toBe(false)
    expect(unchanged).toBe(state)
  })

  it('blocks unknown or foreign additions, never duplicates a selected anchor, and preserves legacy escape', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    state = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'scar-sensation' })
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'scar-sensation' })
    expect(state.selectedFragments).toEqual([])

    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'witness-account' })
    expect(state.selectedFragments).toEqual(['witness-account'])
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'witness-account' })
    expect(state.selectedFragments).toEqual([])
    state = gameReducer(state, { type: 'TOGGLE_FRAGMENT', fragmentId: 'oath-cadence' })
    expect(state.selectedFragments).toEqual([])

    const staleSelection: GameState = {
      ...state,
      selectedFragments: ['oath-cadence', 'scar-sensation'],
    }
    const foreignRemoved = gameReducer(staleSelection, {
      type: 'TOGGLE_FRAGMENT',
      fragmentId: 'oath-cadence',
    })
    const unknownRemoved = gameReducer(foreignRemoved, {
      type: 'TOGGLE_FRAGMENT',
      fragmentId: 'scar-sensation',
    })
    expect(foreignRemoved.selectedFragments).toEqual(['scar-sensation'])
    expect(unknownRemoved.selectedFragments).toEqual([])
  })

  it('keeps an invalid submission in reconstruction with a recovery announcement', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'authenticate-chain' })
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    state = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })
    state = {
      ...state,
      selectedFragments: ['scar-sensation', 'witness-account'],
    }
    const rejected = gameReducer(state, { type: 'SUBMIT_RECONSTRUCTION' })

    expect(rejected.phase).toBe('reconstruction')
    expect(rejected.reconstruction).toBeNull()
    expect(rejected.selectedFragments).toEqual(['scar-sensation', 'witness-account'])
    expect(rejected.announcement).toContain('Select two known anchors')
  })

  it('locks the forged resolution unless the maintenance override was acquired', () => {
    let state = solveReconstruction()
    state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
    state = setCase77Scope(state)
    const withoutOverride = gameReducer(state, { type: 'DECIDE', decisionId: 'overwrite-record' })

    expect(withoutOverride.phase).toBe('tribunal')

    let overrideState = startInvestigation()
    overrideState = gameReducer(overrideState, {
      type: 'COMMIT_FIELD_ACTION',
      actionId: 'forge-authority',
    })
    overrideState = gameReducer(overrideState, {
      type: 'COMMIT_FIELD_ACTION',
      actionId: 'listen-mara',
    })
    overrideState = solveReconstruction(overrideState)
    overrideState = gameReducer(overrideState, { type: 'ENTER_TRIBUNAL' })
    overrideState = setCase77Scope(overrideState)
    overrideState = gameReducer(overrideState, {
      type: 'DECIDE',
      decisionId: 'overwrite-record',
    })

    expect(overrideState.phase).toBe('debrief')
    expect(overrideState.decision).toBe('overwrite-record')
  })

  it('tags the forged Case 77 finding as fraud/systems with a warning event', () => {
    let state = startInvestigation()
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'forge-authority' })
    state = gameReducer(state, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    state = solveReconstruction(state)
    state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
    state = setCase77Scope(state)
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
    state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
    state = setCase77Scope(state)
    state = gameReducer(state, { type: 'DECIDE', decisionId: 'certify-continuity' })

    const event = state.events.at(-1)
    expect(event?.sourceId).toBe('certify-continuity')
    expect(event?.tone).toBe('neutral')
    expect(event?.methodTags).toEqual(['procedure'])
  })

  it('carries a compact run summary into the next loop', () => {
    let state = solveReconstruction()
    state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
    state = setCase77Scope(state)
    state = gameReducer(state, { type: 'DECIDE', decisionId: 'charter-new-person' })
    state = gameReducer(state, { type: 'START_NEXT_RUN' })

    expect(state.runNumber).toBe(2)
    expect(state.previousRuns).toHaveLength(1)
    expect(state.previousRuns[0]?.decision).toBe('charter-new-person')
    expect(state.evidence).toHaveLength(0)
  })

  it('turns prior social trust into bounded residue on the next approach', () => {
    let state = solveReconstruction()
    state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
    state = setCase77Scope(state)
    state = gameReducer(state, { type: 'DECIDE', decisionId: 'charter-new-person' })
    state = gameReducer(state, { type: 'START_NEXT_RUN' })
    state = gameReducer(state, { type: 'SELECT_APPROACH', approachId: 'procedure' })

    expect(state.trust.shepherd).toBe(1)
    expect(state.trust.registrar).toBe(2)
    expect(state.events[0]?.detail).toContain('retain traces')
  })

  it('records the run verdict as the case precedent, not before', () => {
    let state = solveReconstruction()
    state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
    state = setCase77Scope(state)

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
    state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
    state = setCase77Scope(state)
    state = gameReducer(state, { type: 'DECIDE', decisionId: 'charter-new-person' })
    state = gameReducer(state, { type: 'START_NEXT_RUN' })
    state = gameReducer(state, { type: 'SELECT_APPROACH', approachId: 'procedure' })

    const detail = state.events[0]?.detail ?? ''
    expect(detail).toContain('Residue:')
    expect(detail).toContain('Shepherd +1')
  })
})

describe('Case 77 filing scope and compact outcomes', () => {
  it('requires the authored scope before a verdict can commit', () => {
    let tribunal = solveReconstruction()
    tribunal = gameReducer(tribunal, { type: 'ENTER_TRIBUNAL' })

    const rejected = gameReducer(tribunal, {
      type: 'DECIDE',
      decisionId: 'charter-new-person',
    })
    expect(rejected).toBe(tribunal)

    const scoped = setCase77Scope(tribunal, 'general')
    const decided = gameReducer(scoped, {
      type: 'DECIDE',
      decisionId: 'charter-new-person',
    })
    expect(decided.phase).toBe('debrief')
    expect(decided.caseOutcomes['case-77']?.continuityScope).toBe('general')
  })

  it('proves the authority link only for trace-checksum + walk-acoustic-shadow', () => {
    const matrix = [
      {
        actions: ['authenticate-chain', 'walk-acoustic-shadow'],
        expected: 'not-proven',
      },
      {
        actions: ['authenticate-chain', 'forge-authority'],
        expected: 'not-proven',
      },
      {
        actions: ['trace-checksum', 'walk-acoustic-shadow'],
        expected: 'proven',
      },
      {
        actions: ['trace-checksum', 'forge-authority'],
        expected: 'not-proven',
      },
    ] as const

    matrix.forEach(({ actions, expected }) => {
      expect(decideCase77(actions).caseOutcomes['case-77']?.authorityLink77).toBe(
        expected,
      )
    })
    expect(
      decideCase77(['walk-acoustic-shadow', 'trace-checksum']).caseOutcomes['case-77']
        ?.authorityLink77,
    ).toBe('proven')
  })

  it('exports consulted, pressured, and omitted subject contact without a new prologue', () => {
    expect(
      decideCase77(['authenticate-chain', 'listen-mara']).caseOutcomes['case-77']
        ?.valeContact,
    ).toBe('consulted')
    expect(
      decideCase77(['authenticate-chain', 'stress-test']).caseOutcomes['case-77']
        ?.valeContact,
    ).toBe('pressured')
    expect(
      decideCase77(['authenticate-chain', 'walk-acoustic-shadow']).caseOutcomes[
        'case-77'
      ]?.valeContact,
    ).toBe('not-consulted')
  })

  it('carries the latest outcome facts through another run and into Case 81', () => {
    const decided = decideCase77(
      ['trace-checksum', 'walk-acoustic-shadow'],
      'general',
    )
    const nextRun = gameReducer(decided, { type: 'START_NEXT_RUN' })
    expect(nextRun.caseOutcomes).toEqual(decided.caseOutcomes)

    const opened81 = gameReducer(decided, { type: 'START_CASE', caseId: 'case-81' })
    expect(opened81.caseOutcomes).toEqual(decided.caseOutcomes)
  })
})

// A completed Case 77 run at debrief, with charter-new-person recorded — the
// precedent Case 81's tribunal cites and the gate the selection flow reads.
function case77Debrief(): GameState {
  let state = solveReconstruction()
  state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
  state = setCase77Scope(state)
  return gameReducer(state, { type: 'DECIDE', decisionId: 'charter-new-person' })
}

describe('Fourth Margin secret discoveries', () => {
  function registryFiled(): GameState {
    return gameReducer(startInvestigation(), {
      type: 'COMMIT_FIELD_ACTION',
      actionId: 'authenticate-chain',
    })
  }

  function case77DebriefWithNietzsche(): GameState {
    let state = registryFiled()
    state = gameReducer(state, {
      type: 'DISCOVER_SECRET',
      secretId: 'nietzsche-forgetting',
    })
    state = solveReconstruction(state)
    state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
    state = setCase77Scope(state)
    return gameReducer(state, {
      type: 'DECIDE',
      decisionId: 'charter-new-person',
    })
  }

  function case81Debrief(): GameState {
    let state = gameReducer(case77Debrief(), {
      type: 'START_CASE',
      caseId: 'case-81',
    })
    state = gameReducer(state, {
      type: 'SELECT_APPROACH',
      approachId: 'procedure',
    })
    state = gameReducer(state, {
      type: 'COMMIT_FIELD_ACTION',
      actionId: 'audit-restoration-log',
    })
    state = gameReducer(state, {
      type: 'COMMIT_FIELD_ACTION',
      actionId: 'pull-service-record',
    })
    state = gameReducer(state, { type: 'OPEN_RECONSTRUCTION' })
    state = gameReducer(state, {
      type: 'TOGGLE_FRAGMENT',
      fragmentId: 'redacted-clause',
    })
    state = gameReducer(state, {
      type: 'TOGGLE_FRAGMENT',
      fragmentId: 'oath-cadence',
    })
    state = gameReducer(state, { type: 'SUBMIT_RECONSTRUCTION' })
    state = gameReducer(state, { type: 'ENTER_TRIBUNAL' })
    return gameReducer(state, {
      type: 'DECIDE',
      decisionId: 'certify-witness',
    })
  }

  it('discovers an available aphorism once and changes no legal game state', () => {
    const before = registryFiled()
    const definition = getCaseContent('case-77').secrets?.find(
      (secret) => secret.id === 'nietzsche-forgetting',
    )

    expect(canDiscoverSecret(before, 'nietzsche-forgetting')).toBe(true)
    expect(hasDiscoveredSecret(before, 'nietzsche-forgetting')).toBe(false)

    const after = gameReducer(before, {
      type: 'DISCOVER_SECRET',
      secretId: 'nietzsche-forgetting',
    })

    expect(after).toEqual({
      ...before,
      discoveredSecretIds: ['nietzsche-forgetting'],
      announcement: definition?.announcement,
    })
    expect(hasDiscoveredSecret(after, 'nietzsche-forgetting')).toBe(true)
    // The Fourth Margin is explicitly outside the evidentiary event stream.
    expect(after.events).toBe(before.events)
    expect(after.evidence).toBe(before.evidence)
    expect(after.trust).toBe(before.trust)
    expect(after.precedents).toBe(before.precedents)
    expect(after.caseOutcomes).toBe(before.caseOutcomes)

    expect(
      gameReducer(after, {
        type: 'DISCOVER_SECRET',
        secretId: 'nietzsche-forgetting',
      }),
    ).toBe(after)
  })

  it('rejects unavailable, unknown, wrong-case, and wrong-phase discoveries', () => {
    const beforeSite = startInvestigation()
    expect(canDiscoverSecret(beforeSite, 'nietzsche-forgetting')).toBe(false)
    expect(
      gameReducer(beforeSite, {
        type: 'DISCOVER_SECRET',
        secretId: 'nietzsche-forgetting',
      }),
    ).toBe(beforeSite)

    const filed = registryFiled()
    expect(
      gameReducer(filed, {
        type: 'DISCOVER_SECRET',
        secretId: 'not-authored',
      }),
    ).toBe(filed)
    expect(
      gameReducer(filed, {
        type: 'DISCOVER_SECRET',
        secretId: 'schopenhauer-succession',
      }),
    ).toBe(filed)

    const debrief = case77Debrief()
    expect(canDiscoverSecret(debrief, 'nietzsche-forgetting')).toBe(false)
    expect(
      gameReducer(debrief, {
        type: 'DISCOVER_SECRET',
        secretId: 'nietzsche-forgetting',
      }),
    ).toBe(debrief)
  })

  it('makes Reader Key 04 an explicit debrief claim gated by both aphorisms', () => {
    const debrief = case81Debrief()
    const withoutPair = {
      ...debrief,
      discoveredSecretIds: ['nietzsche-forgetting'],
    }
    expect(canDiscoverSecret(withoutPair, 'reader-key-04')).toBe(false)
    expect(
      gameReducer(withoutPair, {
        type: 'DISCOVER_SECRET',
        secretId: 'reader-key-04',
      }),
    ).toBe(withoutPair)

    const withPair = {
      ...debrief,
      discoveredSecretIds: [
        'nietzsche-forgetting',
        'schopenhauer-succession',
      ],
    }
    expect(canDiscoverSecret(withPair, 'reader-key-04')).toBe(true)

    const claimed = gameReducer(withPair, {
      type: 'DISCOVER_SECRET',
      secretId: 'reader-key-04',
    })
    expect(claimed.discoveredSecretIds).toEqual([
      'nietzsche-forgetting',
      'schopenhauer-succession',
      'reader-key-04',
    ])
    expect(claimed).toEqual({
      ...withPair,
      discoveredSecretIds: [
        'nietzsche-forgetting',
        'schopenhauer-succession',
        'reader-key-04',
      ],
      announcement: getCaseContent('case-81').secrets?.find(
        (secret) => secret.id === 'reader-key-04',
      )?.announcement,
    })
  })

  it('carries discoveries across runs and cases, while START_NEW clears them but preserves preferences', () => {
    const decided = case77DebriefWithNietzsche()
    expect(decided.discoveredSecretIds).toEqual(['nietzsche-forgetting'])

    const nextRun = gameReducer(decided, { type: 'START_NEXT_RUN' })
    expect(nextRun.discoveredSecretIds).toEqual(['nietzsche-forgetting'])

    const crossed = gameReducer(decided, {
      type: 'START_CASE',
      caseId: 'case-81',
    })
    expect(crossed.discoveredSecretIds).toEqual(['nietzsche-forgetting'])

    const withPreference = gameReducer(decided, {
      type: 'UPDATE_SETTING',
      setting: 'highContrast',
      value: true,
    })
    const restarted = gameReducer(withPreference, { type: 'START_NEW' })
    expect(restarted.discoveredSecretIds).toEqual([])
    expect(restarted.settings.highContrast).toBe(true)
  })
})

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
    s = gameReducer(s, {
      type: 'COMMIT_DEPOSITION',
      actionId: 'take-sworn-statement',
      beats: ['let-it-stand', 'let-it-stand'],
      askedConsent: true,
    })
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'pull-service-record' })
    s = gameReducer(s, { type: 'OPEN_RECONSTRUCTION' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'oath-cadence' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'unscripted-answer' })
    s = gameReducer(s, { type: 'SUBMIT_RECONSTRUCTION' })
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
    s = gameReducer(s, {
      type: 'COMMIT_DEPOSITION',
      actionId: 'take-sworn-statement',
      beats: ['let-it-stand', 'let-it-stand'],
      askedConsent: true,
    })
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
    // include 'restoration-log'). The deposition also discovers the unscripted
    // answer without corroborating it, so this remains a one-corroborated,
    // valid standing-deadlock pair.
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'audit-restoration-log' })
    s = gameReducer(s, {
      type: 'COMMIT_DEPOSITION',
      actionId: 'take-sworn-statement',
      beats: ['let-it-stand', 'let-it-stand'],
      askedConsent: true,
    })
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
    let s = startInvestigation()
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'forge-authority' })
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'listen-mara' })
    s = solveReconstruction(s)
    s = gameReducer(s, { type: 'ENTER_TRIBUNAL' })
    s = setCase77Scope(s)
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

  it('commits a provisional account with protected disclosure terms', () => {
    let s = case81Investigation('procedure')
    s = gameReducer(s, {
      type: 'COMMIT_DEPOSITION',
      actionId: 'take-sworn-statement',
      beats: ['corroborate', 'corroborate'],
      askedConsent: true,
    })

    // The underlying field action resolved exactly as a plain commit would.
    expect(s.completedSites).toContain('deposition-suite')
    expect(s.completedActions).toContain('take-sworn-statement')
    expect(s.evidence).toContain('sworn-statement')
    // The exact use boundary persists beside consent.
    expect(s.depositionRecord).toEqual({
      actionId: 'take-sworn-statement',
      beats: ['corroborate', 'corroborate'],
      askedConsent: true,
      consent: 'yes',
      testimonyUse: 'protected-hand',
    })
    // Asking = care; no interrupt means no coercion; base action tags fold in.
    expect(s.methodTags).toEqual(expect.arrayContaining(['procedure', 'care']))
    expect(s.methodTags).not.toContain('coercion')
    // One transcript-path event summarizing the run.
    const event = s.events.at(-1)
    expect(event?.sourceId).toBe('take-sworn-statement')
    expect(event?.detail).toContain('protected')
    expect(event?.methodTags).toEqual(expect.arrayContaining(['procedure', 'care']))
    expect(event?.methodTags).not.toContain('coercion')
  })

  it('impose + demand is compelled on either entry; not asking stays unasked', () => {
    let asked = case81Investigation('procedure')
    asked = gameReducer(asked, {
      type: 'COMMIT_DEPOSITION',
      actionId: 'cross-examine-witness',
      beats: ['interrupt', 'interrupt'],
      askedConsent: true,
    })
    expect(asked.depositionRecord?.consent).toBe('no')
    expect(asked.depositionRecord?.testimonyUse).toBe('compelled')
    expect(asked.methodTags).toContain('coercion')
    expect(asked.events.at(-1)?.methodTags).toEqual(
      expect.arrayContaining(['procedure', 'coercion', 'care']),
    )

    let unasked = case81Investigation('procedure')
    unasked = gameReducer(unasked, {
      type: 'COMMIT_DEPOSITION',
      actionId: 'cross-examine-witness',
      beats: ['let-it-stand', 'let-it-stand'],
      askedConsent: false,
    })
    expect(unasked.depositionRecord?.consent).toBe('unasked')
    expect(unasked.depositionRecord?.testimonyUse).toBe('unasked')
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
        beats: ['corroborate', 'corroborate'],
        askedConsent: false,
      }),
    ).toBe(before)
  })

  it('rejects a plain field commit that would bypass the authored use boundary', () => {
    const before = case81Investigation('procedure')
    expect(
      gameReducer(before, {
        type: 'COMMIT_FIELD_ACTION',
        actionId: 'take-sworn-statement',
      }),
    ).toBe(before)
  })

  it('uses the same stable boundary for both deposition entry routes', () => {
    ;['take-sworn-statement', 'cross-examine-witness'].forEach((actionId) => {
      const voluntary = gameReducer(case81Investigation('procedure'), {
        type: 'COMMIT_DEPOSITION',
        actionId,
        beats: ['let-it-stand', 'let-it-stand'],
        askedConsent: true,
      })
      expect(voluntary.depositionRecord?.testimonyUse).toBe('voluntary-office')

      const refused = gameReducer(case81Investigation('procedure'), {
        type: 'COMMIT_DEPOSITION',
        actionId,
        beats: ['let-it-stand', 'interrupt'],
        askedConsent: true,
      })
      expect(refused.depositionRecord?.testimonyUse).toBe('refused')
    })
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
      beats: ['corroborate', 'corroborate'],
      askedConsent: true,
    })
    s = gameReducer(s, { type: 'COMMIT_FIELD_ACTION', actionId: 'pull-service-record' })
    s = gameReducer(s, { type: 'OPEN_RECONSTRUCTION' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'oath-cadence' })
    s = gameReducer(s, { type: 'TOGGLE_FRAGMENT', fragmentId: 'unscripted-answer' })
    s = gameReducer(s, { type: 'SUBMIT_RECONSTRUCTION' })
    s = gameReducer(s, { type: 'ENTER_TRIBUNAL' })
    s = gameReducer(s, { type: 'DECIDE', decisionId: 'strike-testimony' })

    expect(s.phase).toBe('debrief')
    expect(s.decision).toBe('strike-testimony')
    expect(s.depositionRecord?.consent).toBe('yes')
    expect(s.caseOutcomes['case-81']).toEqual({
      testimonyUse81: 'protected-hand',
      officeLink81: 'absent',
      ellisPublicStanding: 'person-only',
    })
    // Fifth verdict recorded as the Case 81 precedent; lawful, neutral event.
    expect(s.precedents['case-81']).toBe('strike-testimony')
    const event = s.events.at(-1)
    expect(event?.sourceId).toBe('strike-testimony')
    expect(event?.tone).toBe('neutral')
    expect(event?.methodTags).toEqual(['procedure'])
  })
})

// Registry Intake's custody rail is view-local stagecraft over these same two
// canonical actions. Freeze their complete engine effects so the physical room can
// never alter evidence, trust, alarm, authority, tags, or filed copy.
describe('Registry Intake canonical field-action effects (frozen)', () => {
  it('authenticate-chain: custody-chain evidence, registrar +2, no alarm or override', () => {
    const before = startInvestigation()
    const after = gameReducer(before, {
      type: 'COMMIT_FIELD_ACTION',
      actionId: 'authenticate-chain',
    })

    expect(after.completedSites).toContain('registry')
    expect(after.completedActions).toContain('authenticate-chain')
    expect(after.evidence).toContain('custody-chain')
    expect(after.methodTags).toEqual(expect.arrayContaining(['procedure']))
    expect(after.alarm).toBe(before.alarm)
    expect(after.tribunalOverride).toBe(false)
    expect(after.trust.registrar).toBe(before.trust.registrar + 2)
    expect(after.trust.shepherd).toBe(before.trust.shepherd)
    expect(after.trust.defector).toBe(before.trust.defector)
    expect(after.trust.archivist).toBe(before.trust.archivist)

    const event = after.events.at(-1)
    expect(event?.sourceType).toBe('field-action')
    expect(event?.sourceId).toBe('authenticate-chain')
    expect(event?.title).toBe('Custody chain authenticated')
    expect(event?.detail).toContain(
      'You proved where every admitted memory came from. You did not prove whom they make.',
    )
    expect(event?.detail).toContain('Anchors revealed:')
    expect(event?.detail).toContain('Civic restoration ledger · final hash receipt')
    expect(event?.detail).toContain('Civic restoration ledger · post-restoration exception note')
    expect(event?.detail).toContain('— Registrar +2.')
    expect(event?.tone).toBe('neutral')
    expect(event?.methodTags).toEqual(['procedure'])
  })

  it('trace-checksum: checksum-drift evidence, registrar −1 / archivist +1, no alarm or override', () => {
    const before = startInvestigation()
    const after = gameReducer(before, {
      type: 'COMMIT_FIELD_ACTION',
      actionId: 'trace-checksum',
    })

    expect(after.completedSites).toContain('registry')
    expect(after.completedActions).toContain('trace-checksum')
    expect(after.evidence).toContain('checksum-drift')
    expect(after.methodTags).toEqual(
      expect.arrayContaining(['systems', 'procedure']),
    )
    expect(after.alarm).toBe(before.alarm)
    expect(after.tribunalOverride).toBe(false)
    expect(after.trust.registrar).toBe(before.trust.registrar - 1)
    expect(after.trust.archivist).toBe(before.trust.archivist + 1)
    expect(after.trust.shepherd).toBe(before.trust.shepherd)
    expect(after.trust.defector).toBe(before.trust.defector)

    const event = after.events.at(-1)
    expect(event?.sourceType).toBe('field-action')
    expect(event?.sourceId).toBe('trace-checksum')
    expect(event?.title).toBe('A late checksum surfaced')
    expect(event?.detail).toContain(
      'The city certified the “original” record in the fourth minute after the collapse, after the original archive was already gone.',
    )
    expect(event?.detail).toContain('Anchors revealed:')
    expect(event?.detail).toContain('Registry mirror node · fourth-minute checksum')
    expect(event?.detail).toContain('Registry mirror node · private-event reconciliation')
    expect(event?.detail).toContain('— Registrar −1, Small Archivist +1.')
    expect(event?.tone).toBe('neutral')
    expect(event?.methodTags).toEqual(['systems', 'procedure'])
  })
})

// Freezes the byte-identical committed effects of the two Maintenance Spine methods.
// The Acoustic Shadow room is a view-local presentation over these SAME actions; it
// must never alter what COMMIT_FIELD_ACTION does. Any drift in evidence, trust,
// alarm, override, method tags, or event copy breaks this guard.
describe('Maintenance Spine canonical field-action effects (frozen)', () => {
  it('walk-acoustic-shadow: sensor-omission evidence, defector +2, no alarm, no override', () => {
    const before = startInvestigation()
    const after = gameReducer(before, {
      type: 'COMMIT_FIELD_ACTION',
      actionId: 'walk-acoustic-shadow',
    })

    expect(after.completedSites).toContain('maintenance')
    expect(after.completedActions).toContain('walk-acoustic-shadow')
    expect(after.evidence).toContain('sensor-omission')
    expect(after.methodTags).toEqual(expect.arrayContaining(['stealth', 'nonlethal']))
    // Alarm delta 0, no override granted.
    expect(after.alarm).toBe(before.alarm)
    expect(after.tribunalOverride).toBe(false)
    // Trust delta { defector: +2 } exactly (other personas unchanged).
    expect(after.trust.defector).toBe(before.trust.defector + 2)
    expect(after.trust.registrar).toBe(before.trust.registrar)
    expect(after.trust.shepherd).toBe(before.trust.shepherd)
    expect(after.trust.archivist).toBe(before.trust.archivist)
    // The logged event is neutral (no alarm) and carries the authored copy.
    const event = after.events.at(-1)
    expect(event?.sourceType).toBe('field-action')
    expect(event?.sourceId).toBe('walk-acoustic-shadow')
    expect(event?.title).toBe('You entered the absent corridor')
    expect(event?.tone).toBe('neutral')
    expect(event?.methodTags).toEqual(['stealth', 'nonlethal'])
    expect(event?.detail).toContain('The fourth minute was excluded by policy')
  })

  it('forge-authority: maintenance-override evidence, +1 alarm, tribunal override, defector +1 / registrar −1', () => {
    const before = startInvestigation()
    const after = gameReducer(before, {
      type: 'COMMIT_FIELD_ACTION',
      actionId: 'forge-authority',
    })

    expect(after.completedSites).toContain('maintenance')
    expect(after.completedActions).toContain('forge-authority')
    expect(after.evidence).toContain('maintenance-override')
    expect(after.methodTags).toEqual(expect.arrayContaining(['systems', 'fraud']))
    // Alarm delta +1, override granted.
    expect(after.alarm).toBe(before.alarm + 1)
    expect(after.tribunalOverride).toBe(true)
    // Trust delta { defector: +1, registrar: -1 } exactly.
    expect(after.trust.defector).toBe(before.trust.defector + 1)
    expect(after.trust.registrar).toBe(before.trust.registrar - 1)
    expect(after.trust.shepherd).toBe(before.trust.shepherd)
    expect(after.trust.archivist).toBe(before.trust.archivist)
    // The logged event is a warning (alarm raised) with the authored copy.
    const event = after.events.at(-1)
    expect(event?.sourceId).toBe('forge-authority')
    expect(event?.title).toBe('A dead credential answered')
    expect(event?.tone).toBe('warning')
    expect(event?.methodTags).toEqual(['systems', 'fraud'])
    expect(event?.detail).toContain('an authority the system accepts and the law does not')
  })
})
